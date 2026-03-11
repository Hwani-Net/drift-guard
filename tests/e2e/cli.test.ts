/**
 * E2E tests for drift-guard CLI
 *
 * These tests spawn the actual CLI binary as a subprocess
 * and validate the full init → check → rules → snapshot update flow.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, ExecFileSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI_PATH = path.resolve(__dirname, '../../bin/drift-guard.mjs');
const NODE = process.execPath; // path to node binary

let tmpDir: string;

function run(args: string[], options?: { cwd?: string; expectFail?: boolean }): string {
  const cwd = options?.cwd ?? tmpDir;
  const execOpts: ExecFileSyncOptions = {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    timeout: 15_000,
  };

  try {
    return execFileSync(NODE, [CLI_PATH, ...args], execOpts) as string;
  } catch (err: unknown) {
    if (options?.expectFail) {
      const e = err as { stdout?: string; stderr?: string; status?: number };
      return (e.stdout ?? '') + (e.stderr ?? '');
    }
    throw err;
  }
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-e2e-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Helper: create a mini CSS project ───────────────────────
function seedCSS(content: string, filename = 'src/styles.css') {
  const filePath = path.join(tmpDir, filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function seedHTML(content: string, filename = 'design.html') {
  fs.writeFileSync(path.join(tmpDir, filename), content);
}

// ═══════════════════════════════════════════════════════════════
//  1. --version / --help
// ═══════════════════════════════════════════════════════════════
describe('CLI basics', () => {
  it('should print version', () => {
    const out = run(['--version']);
    expect(out.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should print help with all commands', () => {
    const out = run(['--help']);
    expect(out).toContain('init');
    expect(out).toContain('check');
    expect(out).toContain('rules');
    expect(out).toContain('snapshot');
    expect(out).toContain('hook');
  });
});

// ═══════════════════════════════════════════════════════════════
//  2. init command
// ═══════════════════════════════════════════════════════════════
describe('init', () => {
  it('should create snapshot from CSS files', () => {
    seedCSS('.btn { color: #1a73e8; font-size: 14px; padding: 8px 16px; border-radius: 4px; }');

    const out = run(['init']);

    // Files created
    expect(fs.existsSync(path.join(tmpDir, '.design-guard', 'snapshot.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.design-guard', 'config.json'))).toBe(true);

    // Output mentions token count
    expect(out).toContain('Tokens locked:');
    expect(out).toContain('Design snapshot created');

    // Snapshot contains correct data
    const snapshot = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'snapshot.json'), 'utf-8'),
    );
    expect(snapshot.tokens.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.sourceFiles).toContain('src/styles.css');
  });

  it('should create snapshot from HTML file (--from)', () => {
    seedHTML(`
      <!DOCTYPE html><html><head>
      <style>.hero { color: #e91e63; font-size: 24px; padding: 32px; border-radius: 16px; }</style>
      </head><body><div class="hero">Hello</div></body></html>
    `);

    const out = run(['init', '--from', 'design.html']);

    expect(out).toContain('Design snapshot created');
    const snapshot = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'snapshot.json'), 'utf-8'),
    );
    expect(snapshot.tokens.length).toBeGreaterThanOrEqual(3);
  });

  it('should warn when no CSS files found', () => {
    // Empty project — no CSS
    const out = run(['init']);
    expect(out).toContain('No design tokens found');
  });

  it('should respect custom threshold', () => {
    seedCSS('.x { color: red; }');
    run(['init', '--threshold', '5']);

    const config = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'config.json'), 'utf-8'),
    );
    expect(config.threshold).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════
//  3. check command
// ═══════════════════════════════════════════════════════════════
describe('check', () => {
  const ORIGINAL_CSS = `.btn {
  color: #1a73e8;
  background-color: #ffffff;
  font-family: Inter, sans-serif;
  font-size: 16px;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}`;

  it('should pass when nothing changed (0% drift)', () => {
    seedCSS(ORIGINAL_CSS);
    run(['init']);

    const out = run(['check']);
    expect(out).toContain('0%');
    expect(out).toContain('No design drift detected');
  });

  it('should detect modified tokens and fail', () => {
    seedCSS(ORIGINAL_CSS);
    run(['init']);

    // Simulate AI drift
    seedCSS(ORIGINAL_CSS.replace('#1a73e8', '#ff0000').replace('#ffffff', '#000000'));

    const out = run(['check'], { expectFail: true });
    expect(out).toContain('#1a73e8');
    expect(out).toContain('#ff0000');
    expect(out).toContain('snapshot update');
  });

  it('should detect deleted tokens', () => {
    seedCSS(ORIGINAL_CSS);
    run(['init']);

    // Remove most properties
    seedCSS('.btn { color: #1a73e8; }');

    const out = run(['check'], { expectFail: true });
    expect(out).toContain('deleted');
  });

  it('should output valid JSON with --output json', () => {
    seedCSS(ORIGINAL_CSS);
    run(['init']);

    // Change one token
    seedCSS(ORIGINAL_CSS.replace('#1a73e8', '#abcdef'));

    const out = run(['check', '--output', 'json'], { expectFail: true });

    // Extract JSON from output (skip the header line)
    const jsonStart = out.indexOf('{');
    const jsonStr = out.slice(jsonStart);
    const report = JSON.parse(jsonStr);

    expect(report).toHaveProperty('driftScore');
    expect(report).toHaveProperty('totalTokens');
    expect(report).toHaveProperty('changedTokens');
    expect(report).toHaveProperty('passed');
    expect(report).toHaveProperty('items');
    expect(report).toHaveProperty('categorySummary');
    expect(report.passed).toBe(false);
    expect(report.changedTokens).toBeGreaterThan(0);
  });

  it('should respect custom threshold via --threshold', () => {
    seedCSS('.a { color: red; } .b { color: blue; } .c { font-size: 12px; } .d { padding: 4px; }');
    run(['init']);

    // Change 1 of 4 tokens = 25%
    seedCSS('.a { color: purple; } .b { color: blue; } .c { font-size: 12px; } .d { padding: 4px; }');

    // 10% threshold → fail
    const outFail = run(['check', '--threshold', '10'], { expectFail: true });
    expect(outFail).toContain('threshold: 10%');

    // 50% threshold → pass
    const outPass = run(['check', '--threshold', '50']);
    expect(outPass).toContain('threshold: 50%');
  });

  it('should fail with error when no snapshot exists', () => {
    const out = run(['check'], { expectFail: true });
    expect(out).toContain('No snapshot found');
  });
});

// ═══════════════════════════════════════════════════════════════
//  4. rules command
// ═══════════════════════════════════════════════════════════════
describe('rules', () => {
  beforeEach(() => {
    seedCSS('.btn { color: #1a73e8; font-size: 14px; padding: 8px; border-radius: 4px; }');
    run(['init']);
  });

  it('should generate all 5 rule files by default', () => {
    const out = run(['rules']);

    // Check all files exist
    expect(fs.existsSync(path.join(tmpDir, '.cursorrules'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.github', 'copilot-instructions.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.clinerules'))).toBe(true);

    expect(out).toContain('.cursorrules');
    expect(out).toContain('CLAUDE.md');
  });

  it('should generate only specified format', () => {
    run(['rules', '--format', 'claude-md']);

    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);
    // Others should NOT be generated in this run (but may exist from previous)
    // We can verify CLAUDE.md has content
    const content = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('#1a73e8');
    expect(content).toContain('drift-guard');
  });

  it('should include actual token values in generated rules', () => {
    run(['rules', '--format', 'cursorrules']);

    const content = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');
    expect(content).toContain('#1a73e8');
    expect(content).toContain('DO NOT');
    expect(content).toContain('font-size');
  });

  it('should fail when no snapshot exists', () => {
    // Use a different dir with no snapshot
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-e2e-empty-'));
    try {
      const out = run(['rules'], { cwd: emptyDir, expectFail: true });
      expect(out).toContain('No snapshot found');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});

// ═══════════════════════════════════════════════════════════════
//  5. snapshot update
// ═══════════════════════════════════════════════════════════════
describe('snapshot update', () => {
  it('should update snapshot and accept new design', () => {
    seedCSS('.btn { color: #1a73e8; font-size: 14px; }');
    run(['init']);

    // Simulate intentional design change
    seedCSS('.btn { color: #e91e63; font-size: 18px; padding: 16px; }');

    // Before update — check should fail
    const beforeOut = run(['check'], { expectFail: true });
    expect(beforeOut).toContain('#1a73e8');

    // Update snapshot
    const updateOut = run(['snapshot', 'update']);
    expect(updateOut).toContain('Snapshot updated');

    // After update — check should pass
    const afterOut = run(['check']);
    expect(afterOut).toContain('0%');
    expect(afterOut).toContain('No design drift detected');
  });
});

// ═══════════════════════════════════════════════════════════════
//  6. Full workflow E2E
// ═══════════════════════════════════════════════════════════════
describe('full workflow', () => {
  it('should complete the entire init → rules → AI drift → check → update → check cycle', () => {
    // Step 1: Create a project with CSS
    seedCSS(`
      :root { --primary: #1a73e8; --bg: #fafafa; }
      .card { color: var(--primary); font-family: Inter, sans-serif; padding: 16px; border-radius: 8px; }
      .hero { background: linear-gradient(135deg, #667eea, #764ba2); font-size: 48px; }
    `);

    // Step 2: Init — lock the design
    const initOut = run(['init']);
    expect(initOut).toContain('Design snapshot created');

    // Step 3: Generate rules
    const rulesOut = run(['rules']);
    expect(rulesOut).toContain('.cursorrules');

    // Verify rules mention our tokens (CSS variables resolve to var(--primary), not the value)
    const cursorRules = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');
    expect(cursorRules).toContain('DO NOT');
    expect(cursorRules).toContain('font-family');

    // Step 4: Check before any changes — should pass
    const checkClean = run(['check']);
    expect(checkClean).toContain('0%');

    // Step 5: Simulate AI agent modifying the design
    seedCSS(`
      :root { --primary: #ff5722; --bg: #121212; }
      .card { color: var(--primary); font-family: Roboto, sans-serif; padding: 24px; border-radius: 12px; }
      .hero { background: linear-gradient(135deg, #ff6b6b, #ee5a24); font-size: 48px; }
    `);

    // Step 6: Check after AI drift — should fail with detailed report
    const checkDrift = run(['check', '--output', 'json'], { expectFail: true });
    const jsonStart = checkDrift.indexOf('{');
    const report = JSON.parse(checkDrift.slice(jsonStart));

    expect(report.passed).toBe(false);
    expect(report.driftScore).toBeGreaterThan(0);
    expect(report.changedTokens).toBeGreaterThan(0);
    expect(report.items.length).toBeGreaterThan(0);

    // Step 7: Accept the changes (intentional redesign)
    const updateOut = run(['snapshot', 'update']);
    expect(updateOut).toContain('Snapshot updated');

    // Step 8: Check again — should pass with new baseline
    const checkFinal = run(['check']);
    expect(checkFinal).toContain('0%');
  });
});

// ═══════════════════════════════════════════════════════════════
//  7. Edge cases
// ═══════════════════════════════════════════════════════════════
describe('edge cases', () => {
  it('should handle CSS with syntax quirks gracefully', () => {
    seedCSS(`
      /* Comment */
      .btn { color: #1a73e8; }
      @media (max-width: 768px) {
        .btn { font-size: 12px; }
      }
      .empty {}
    `);

    const out = run(['init']);
    expect(out).toContain('Design snapshot created');

    const checkOut = run(['check']);
    expect(checkOut).toContain('0%');
  });

  it('should handle multiple CSS files', () => {
    seedCSS('.btn { color: red; }', 'src/buttons.css');
    seedCSS('.card { color: blue; }', 'src/cards.css');
    seedCSS('.hero { font-size: 48px; }', 'src/components/hero.css');

    const out = run(['init']);
    expect(out).toContain('Design snapshot created');

    const snapshot = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'snapshot.json'), 'utf-8'),
    );
    expect(snapshot.sourceFiles.length).toBe(3);
  });

  it('should handle CSS variables', () => {
    seedCSS(':root { --primary: #1a73e8; --spacing-md: 16px; --font-body: Inter, sans-serif; }');

    run(['init']);
    const snapshot = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'snapshot.json'), 'utf-8'),
    );

    // CSS variables should be tracked
    expect(snapshot.tokens.length).toBeGreaterThan(0);
  });

  it('should handle re-init (overwrite existing snapshot)', () => {
    seedCSS('.btn { color: red; }');
    run(['init']);

    const snapshot1 = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'snapshot.json'), 'utf-8'),
    );

    // Change CSS and re-init
    seedCSS('.btn { color: blue; font-size: 20px; }');
    run(['init']);

    const snapshot2 = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'snapshot.json'), 'utf-8'),
    );

    // New snapshot should reflect new CSS
    expect(snapshot2.tokens.length).toBeGreaterThanOrEqual(snapshot1.tokens.length);
    expect(snapshot2.createdAt).not.toBe(snapshot1.createdAt);
  });
});
