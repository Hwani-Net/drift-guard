/**
 * Real-world scenario E2E tests for drift-guard
 *
 * These tests simulate ACTUAL usage scenarios:
 * 1. A real Shadcn UI project with oklch/HSL CSS variables
 * 2. AI agent making "feature additions" that accidentally drift the design
 * 3. drift-guard detecting the drift
 *
 * Based on actual globals.css from BizPilot (467 lines, Shadcn + Tailwind v4)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync, ExecFileSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI_PATH = path.resolve(__dirname, '../../bin/drift-guard.mjs');
const NODE = process.execPath;

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

function seedFile(content: string, filename: string) {
  const filePath = path.join(tmpDir, filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dg-real-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════
//  Real Shadcn UI globals.css (derived from BizPilot production)
// ═══════════════════════════════════════════════════════════════
const SHADCN_GLOBALS_CSS = `
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0 0);
}

body {
  font-family: 'Geist', 'Geist Fallback', sans-serif;
  background-color: var(--background);
  color: var(--foreground);
}
`;

// Component CSS that a real project would have
const COMPONENT_CSS = `
.btn-primary {
  background-color: var(--primary);
  color: var(--primary-foreground);
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.card {
  background-color: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.input {
  border: 1px solid var(--input);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  background-color: transparent;
}

.sidebar {
  background-color: var(--sidebar);
  color: var(--sidebar-foreground);
  border-right: 1px solid var(--sidebar-border);
  padding: 1rem;
  font-family: 'Geist', sans-serif;
}
`;

// HSL-based Shadcn CSS (older Tailwind v3 style)
const SHADCN_HSL_CSS = `
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
`;

// ═══════════════════════════════════════════════════════════════
//  Scenario 1: AI adds a login form and accidentally changes colors
// ═══════════════════════════════════════════════════════════════
describe('Scenario: AI adds login form and drifts the design', () => {
  beforeEach(() => {
    seedFile(SHADCN_GLOBALS_CSS, 'src/app/globals.css');
    seedFile(COMPONENT_CSS, 'src/components/ui.css');
  });

  it('should lock 50+ tokens from a real Shadcn project', () => {
    const out = run(['init']);
    expect(out).toContain('Design snapshot created');

    const snapshot = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'snapshot.json'), 'utf-8'),
    );
    // A real Shadcn project should have many tokens
    expect(snapshot.tokens.length).toBeGreaterThanOrEqual(50);
    expect(snapshot.sourceFiles).toContain('src/app/globals.css');
    expect(snapshot.sourceFiles).toContain('src/components/ui.css');
  });

  it('should PASS when AI adds new code without touching existing design', () => {
    run(['init']);

    // AI adds a login form — NEW file, doesn't touch existing CSS
    seedFile(`
      .login-form {
        max-width: 400px;
        margin: 0 auto;
        padding: 2rem;
      }
      .login-form__input {
        width: 100%;
        margin-bottom: 1rem;
      }
      .login-form__button {
        width: 100%;
        cursor: pointer;
      }
    `, 'src/components/login.css');

    const out = run(['check']);
    expect(out).toContain('0%');
    expect(out).toContain('No design drift detected');
  });

  it('should DETECT when AI changes primary color while adding a feature', () => {
    run(['init']);

    // AI "adds dark mode support" but accidentally changes :root primary color
    // Note: .replace() only replaces the first match, so :root's --primary is changed
    const driftedCSS = SHADCN_GLOBALS_CSS
      .replace('--primary: oklch(0.205 0 0)', '--primary: oklch(0.45 0.2 260)')  // :root changed!
      .replace('--accent: oklch(0.97 0 0)', '--accent: oklch(0.55 0.15 200)');   // :root changed!

    seedFile(driftedCSS, 'src/app/globals.css');

    // Use --threshold 0 for strict detection (default 10% would pass with only 2/70+ tokens changed)
    const out = run(['check', '--threshold', '0', '--output', 'json'], { expectFail: true });
    const jsonStart = out.indexOf('{');
    const report = JSON.parse(out.slice(jsonStart));

    expect(report.passed).toBe(false);
    expect(report.changedTokens).toBeGreaterThanOrEqual(2);
    // Should specifically flag the changed tokens
    const changedProps = report.items.map((i: any) => i.original.property);
    expect(changedProps).toContain('--primary');
    expect(changedProps).toContain('--accent');
  });

  it('should DETECT when AI replaces font family', () => {
    run(['init']);

    // AI decides "Roboto looks better" while adding a feature
    const driftedCSS = SHADCN_GLOBALS_CSS.replace(
      `font-family: 'Geist', 'Geist Fallback', sans-serif`,
      `font-family: 'Roboto', 'Arial', sans-serif`,
    );
    seedFile(driftedCSS, 'src/app/globals.css');

    const out = run(['check', '--threshold', '0'], { expectFail: true });
    expect(out).toContain('font-family');
  });

  it('should DETECT when AI changes border-radius and spacing', () => {
    run(['init']);

    // AI adds a "modern feel" and changes radius + padding
    const driftedComponents = COMPONENT_CSS
      .replace('border-radius: 0.375rem', 'border-radius: 1rem')
      .replace('border-radius: 0.5rem', 'border-radius: 1.5rem')
      .replace('padding: 1.5rem', 'padding: 2rem')
      .replace('padding: 0.5rem 1rem', 'padding: 0.75rem 1.5rem');

    seedFile(driftedComponents, 'src/components/ui.css');

    // Use --threshold 0 for strict detection
    const out = run(['check', '--threshold', '0', '--output', 'json'], { expectFail: true });
    const jsonStart = out.indexOf('{');
    const report = JSON.parse(out.slice(jsonStart));

    expect(report.passed).toBe(false);
    // Should catch radius and spacing changes
    const categories = report.items.map((i: any) => i.original.category);
    expect(categories).toContain('radius');
    expect(categories).toContain('spacing');
  });

  it('should DETECT when AI changes box-shadow', () => {
    run(['init']);

    // AI adds "elevated card" look
    const driftedComponents = COMPONENT_CSS
      .replace(
        'box-shadow: 0 1px 3px rgba(0,0,0,0.1)',
        'box-shadow: 0 10px 40px rgba(0,0,0,0.3)',
      );

    seedFile(driftedComponents, 'src/components/ui.css');

    const out = run(['check', '--threshold', '0'], { expectFail: true });
    expect(out).toContain('box-shadow');
  });
});

// ═══════════════════════════════════════════════════════════════
//  Scenario 2: AI refactors entire dark mode — mass drift
// ═══════════════════════════════════════════════════════════════
describe('Scenario: AI refactors dark mode causing mass drift', () => {
  it('should detect multiple dark mode token changes at once', () => {
    seedFile(SHADCN_GLOBALS_CSS, 'src/globals.css');
    run(['init']);

    // AI "improves dark mode contrast" — changes dark tokens
    // Note: .replace() only replaces the FIRST match.
    // Values like `oklch(0.145 0 0)` appear in both :root and .dark for different vars,
    // so we target unique values only present in .dark section.
    const driftedCSS = SHADCN_GLOBALS_CSS
      .replace('--sidebar-primary: oklch(0.488 0.243 264.376)', '--sidebar-primary: oklch(0.6 0.3 300)')  // dark sidebar-primary (unique)
      .replace('--destructive: oklch(0.396 0.141 25.723)', '--destructive: oklch(0.5 0.2 30)')            // dark destructive (unique)
      .replace('--destructive-foreground: oklch(0.637 0.237 25.331)', '--destructive-foreground: oklch(0.7 0.3 20)')  // dark destructive-fg (unique)
      .replace('--chart-1: oklch(0.488 0.243 264.376)', '--chart-1: oklch(0.6 0.3 280)')                  // dark chart-1 (unique)
      .replace('--chart-4: oklch(0.627 0.265 303.9)', '--chart-4: oklch(0.7 0.3 310)');                   // dark chart-4 (unique)

    seedFile(driftedCSS, 'src/globals.css');

    // Use --threshold 0 for strict detection
    const out = run(['check', '--threshold', '0', '--output', 'json'], { expectFail: true });
    const jsonStart = out.indexOf('{');
    const report = JSON.parse(out.slice(jsonStart));

    expect(report.passed).toBe(false);
    expect(report.changedTokens).toBeGreaterThanOrEqual(5);
    // Drift score should be significant
    expect(report.driftScore).toBeGreaterThan(5);
  });
});

// ═══════════════════════════════════════════════════════════════
//  Scenario 3: HSL bare value format (Tailwind v3 / older Shadcn)
// ═══════════════════════════════════════════════════════════════
describe('Scenario: HSL bare values (Tailwind v3 style)', () => {
  it('should detect tokens from HSL bare values like "222.2 84% 4.9%"', () => {
    seedFile(SHADCN_HSL_CSS, 'src/globals.css');

    const out = run(['init']);
    expect(out).toContain('Design snapshot created');

    const snapshot = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'snapshot.json'), 'utf-8'),
    );

    // HSL bare values should be categorized as color, not "other"
    const colorTokens = snapshot.tokens.filter(
      (t: { category: string }) => t.category === 'color',
    );
    expect(colorTokens.length).toBeGreaterThanOrEqual(15);

    // Check specific ones
    const primaryToken = snapshot.tokens.find(
      (t: { property: string; selector: string }) =>
        t.property === '--primary' && t.selector === ':root',
    );
    expect(primaryToken).toBeDefined();
    expect(primaryToken.category).toBe('color');
  });

  it('should detect drift in HSL bare values', () => {
    seedFile(SHADCN_HSL_CSS, 'src/globals.css');
    run(['init']);

    // AI changes primary color (first occurrence = :root)
    const driftedCSS = SHADCN_HSL_CSS
      .replace('--primary: 222.2 47.4% 11.2%', '--primary: 200 80% 50%')
      .replace('--destructive: 0 84.2% 60.2%', '--destructive: 0 90% 45%');

    seedFile(driftedCSS, 'src/globals.css');

    // Use --threshold 0 for strict detection
    const out = run(['check', '--threshold', '0', '--output', 'json'], { expectFail: true });
    const jsonStart = out.indexOf('{');
    const report = JSON.parse(out.slice(jsonStart));

    expect(report.passed).toBe(false);
    const changedProps = report.items.map((i: any) => i.original.property);
    expect(changedProps).toContain('--primary');
    expect(changedProps).toContain('--destructive');
  });
});

// ═══════════════════════════════════════════════════════════════
//  Scenario 4: AI generates rules → rules should contain real tokens
// ═══════════════════════════════════════════════════════════════
describe('Scenario: Generated rules contain real Shadcn tokens', () => {
  it('should embed actual oklch values in .cursorrules', () => {
    seedFile(SHADCN_GLOBALS_CSS, 'src/globals.css');
    run(['init']);
    run(['rules', '--format', 'cursorrules']);

    const rules = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');

    // Rules should mention actual token names
    expect(rules).toContain('--primary');
    expect(rules).toContain('--destructive');
    expect(rules).toContain('DO NOT');
    expect(rules).toContain('drift-guard');
  });

  it('should embed actual oklch values in CLAUDE.md', () => {
    seedFile(SHADCN_GLOBALS_CSS, 'src/globals.css');
    run(['init']);
    run(['rules', '--format', 'claude-md']);

    const rules = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');

    expect(rules).toContain('--primary');
    expect(rules).toContain('--sidebar');
    expect(rules).toContain('DO NOT');
  });
});

// ═══════════════════════════════════════════════════════════════
//  Scenario 5: Full realistic workflow — init → AI feature → detect → accept
// ═══════════════════════════════════════════════════════════════
describe('Scenario: Full workflow — designer handoff → AI feature → drift → fix', () => {
  it('should complete the protect → detect → decide cycle with real CSS', () => {
    // Step 1: Designer delivers Shadcn project
    seedFile(SHADCN_GLOBALS_CSS, 'src/app/globals.css');
    seedFile(COMPONENT_CSS, 'src/components/ui.css');

    // Step 2: Dev runs init to lock the design
    const initOut = run(['init']);
    expect(initOut).toContain('Design snapshot created');

    const snapshot = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'snapshot.json'), 'utf-8'),
    );
    const tokenCountBefore = snapshot.tokens.length;
    expect(tokenCountBefore).toBeGreaterThanOrEqual(50);

    // Step 3: Generate rules so AI agents know the constraints
    run(['rules']);
    expect(fs.existsSync(path.join(tmpDir, '.cursorrules'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'CLAUDE.md'))).toBe(true);

    // Step 4: Check — should be clean
    const cleanCheck = run(['check']);
    expect(cleanCheck).toContain('0%');

    // Step 5: AI agent adds a "dashboard stats" feature
    // It adds new CSS (good) but ALSO changes card shadow and primary color (bad)
    seedFile(`
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        padding: 2rem;
      }
      .stat-card {
        background: var(--card);
        border-radius: 0.75rem;
        padding: 1.25rem;
        border: 1px solid var(--border);
      }
      .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: var(--primary);
      }
    `, 'src/components/dashboard.css');

    // AI also "tweaks" existing CSS — THIS is the drift
    const driftedGlobals = SHADCN_GLOBALS_CSS
      .replace('--primary: oklch(0.205 0 0)', '--primary: oklch(0.35 0.15 250)')
      .replace('--chart-1: oklch(0.646 0.222 41.116)', '--chart-1: oklch(0.5 0.3 260)');
    seedFile(driftedGlobals, 'src/app/globals.css');

    const driftedComponents = COMPONENT_CSS
      .replace('box-shadow: 0 1px 3px rgba(0,0,0,0.1)', 'box-shadow: 0 4px 12px rgba(0,0,0,0.15)');
    seedFile(driftedComponents, 'src/components/ui.css');

    // Step 6: Run check with --threshold 0 — should FAIL with drift report
    const driftCheck = run(['check', '--threshold', '0', '--output', 'json'], { expectFail: true });
    const jsonStart = driftCheck.indexOf('{');
    const report = JSON.parse(driftCheck.slice(jsonStart));

    expect(report.passed).toBe(false);
    expect(report.changedTokens).toBeGreaterThanOrEqual(3);

    const changedProps = report.items.map((i: any) => i.original.property);
    expect(changedProps).toContain('--primary');
    expect(changedProps).toContain('--chart-1');
    expect(changedProps).toContain('box-shadow');

    // Step 7: Dev reverts the AI's design changes but keeps the new feature
    seedFile(SHADCN_GLOBALS_CSS, 'src/app/globals.css');        // revert globals
    seedFile(COMPONENT_CSS, 'src/components/ui.css');            // revert components
    // dashboard.css stays — it's the new feature

    // Step 8: Check again — should PASS (design restored, new feature kept)
    const fixedCheck = run(['check']);
    expect(fixedCheck).toContain('0%');
    expect(fixedCheck).toContain('No design drift detected');
  });
});

// ═══════════════════════════════════════════════════════════════
//  Scenario 6: Intentional redesign → snapshot update
// ═══════════════════════════════════════════════════════════════
describe('Scenario: Intentional redesign with snapshot update', () => {
  it('should allow designers to update the baseline after intentional changes', () => {
    seedFile(SHADCN_GLOBALS_CSS, 'src/globals.css');
    run(['init']);

    // Designer intentionally rebrands — new primary color
    const rebrandedCSS = SHADCN_GLOBALS_CSS
      .replace('--primary: oklch(0.205 0 0)', '--primary: oklch(0.55 0.25 145)')    // green brand
      .replace('--accent: oklch(0.97 0 0)', '--accent: oklch(0.9 0.05 145)');       // matching accent

    seedFile(rebrandedCSS, 'src/globals.css');

    // Check detects the change (use --threshold 0 for strict detection)
    const driftOut = run(['check', '--threshold', '0'], { expectFail: true });
    expect(driftOut).toContain('--primary');

    // Designer approves — update snapshot
    const updateOut = run(['snapshot', 'update']);
    expect(updateOut).toContain('Snapshot updated');

    // Now check passes with new baseline
    const passOut = run(['check']);
    expect(passOut).toContain('0%');

    // Regenerate rules with new tokens
    run(['rules', '--format', 'cursorrules']);
    const newRules = fs.readFileSync(path.join(tmpDir, '.cursorrules'), 'utf-8');
    expect(newRules).toContain('--primary');
    expect(newRules).toContain('DO NOT');
  });
});

// ═══════════════════════════════════════════════════════════════
//  Scenario 7: Multi-file drift detection
// ═══════════════════════════════════════════════════════════════
describe('Scenario: Multi-file project drift across several CSS files', () => {
  it('should detect drift spread across multiple files', () => {
    // Realistic project structure
    seedFile(SHADCN_GLOBALS_CSS, 'src/app/globals.css');
    seedFile(COMPONENT_CSS, 'src/components/ui.css');
    seedFile(`
      .header { background-color: var(--primary); padding: 1rem 2rem; }
      .header__logo { font-size: 1.5rem; font-weight: 700; color: var(--primary-foreground); }
      .header__nav { display: flex; gap: 1.5rem; }
    `, 'src/components/header.css');
    seedFile(`
      .footer { background-color: var(--muted); padding: 2rem; border-top: 1px solid var(--border); }
      .footer__link { color: var(--muted-foreground); font-size: 0.875rem; }
    `, 'src/components/footer.css');

    run(['init']);

    const snapshot = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.design-guard', 'snapshot.json'), 'utf-8'),
    );
    expect(snapshot.sourceFiles.length).toBe(4);

    // AI modifies header and footer while "adding a CTA banner"
    seedFile(`
      .header { background-color: #1a1a2e; padding: 0.75rem 1.5rem; }
      .header__logo { font-size: 2rem; font-weight: 800; color: #e94560; }
      .header__nav { display: flex; gap: 2rem; }
      .cta-banner { background: linear-gradient(135deg, #e94560, #0f3460); padding: 1rem; }
    `, 'src/components/header.css');

    seedFile(`
      .footer { background-color: #16213e; padding: 3rem; border-top: 2px solid #e94560; }
      .footer__link { color: #a0a0b0; font-size: 0.75rem; }
    `, 'src/components/footer.css');

    // Use --threshold 0 for strict detection
    const out = run(['check', '--threshold', '0', '--output', 'json'], { expectFail: true });
    const jsonStart = out.indexOf('{');
    const report = JSON.parse(out.slice(jsonStart));

    expect(report.passed).toBe(false);
    // Drift should come from multiple files
    expect(report.changedTokens).toBeGreaterThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════════════════════════
//  Scenario 8: Threshold-based acceptance for minor drift
// ═══════════════════════════════════════════════════════════════
describe('Scenario: Minor drift within acceptable threshold', () => {
  it('should PASS when drift is below custom threshold', () => {
    seedFile(SHADCN_GLOBALS_CSS, 'src/globals.css');
    seedFile(COMPONENT_CSS, 'src/components/ui.css');
    run(['init']);

    // AI makes a tiny change — only 1 shadow value out of 50+ tokens
    const minorDrift = COMPONENT_CSS.replace(
      'box-shadow: 0 1px 2px rgba(0,0,0,0.05)',
      'box-shadow: 0 1px 3px rgba(0,0,0,0.08)',
    );
    seedFile(minorDrift, 'src/components/ui.css');

    // With a generous threshold of 20%, this should pass
    const out = run(['check', '--threshold', '20']);
    expect(out).toContain('threshold: 20%');

    // But with strict 0% threshold, it should fail
    const strictOut = run(['check', '--threshold', '0'], { expectFail: true });
    expect(strictOut).toContain('box-shadow');
  });
});

// ═══════════════════════════════════════════════════════════════
//  Scenario 9: Stitch HTML — Tailwind config drift detection
// ═══════════════════════════════════════════════════════════════
const STITCH_HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<title>Test App</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet"/>
<script id="tailwind-config">
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        colors: {
          "primary": "#256af4",
          "background-light": "#f5f6f8",
          "background-dark": "#101622",
        },
        fontFamily: {
          "display": ["Inter", "sans-serif"]
        },
        borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
      },
    },
  }
</script>
<style>
  body {
    font-family: 'Inter', sans-serif;
    line-height: 1.6;
  }
</style>
</head>
<body>
<header style="padding: 1rem 2rem; display: flex; justify-content: space-between;">
  <span>Logo</span>
  <nav>Links</nav>
</header>
<main>
  <h1>Hello World</h1>
</main>
</body></html>`;

describe('Scenario: Stitch HTML — Tailwind config tokens', () => {
  it('should extract tailwind config tokens (colors, radius, fonts)', () => {
    seedFile(STITCH_HTML, 'design.html');
    const out = run(['init', '--from', 'design.html']);

    // Should find tailwind config tokens in addition to style/inline tokens
    expect(out).toContain('Tokens locked:');
    // Extract the token count
    const tokenMatch = out.match(/Tokens locked:\s*(\d+)/);
    expect(tokenMatch).not.toBeNull();
    const tokenCount = parseInt(tokenMatch![1], 10);
    // Should have: 3 colors (tw), 4 radius (tw), 1 font (tw) + CSS style tokens + inline tokens
    expect(tokenCount).toBeGreaterThanOrEqual(8);  // at minimum the tw config tokens
  });

  it('should DETECT when AI changes Tailwind config primary color', () => {
    seedFile(STITCH_HTML, 'design.html');
    run(['init', '--from', 'design.html']);

    // AI changes the primary color in the tailwind config
    const driftedHTML = STITCH_HTML.replace(
      '"primary": "#256af4"',
      '"primary": "#e94560"',
    );
    seedFile(driftedHTML, 'design.html');

    const out = run(['check', '--threshold', '0'], { expectFail: true });
    expect(out).toContain('--tw-primary');
    expect(out).toContain('#256af4');
    expect(out).toContain('#e94560');
  });

  it('should DETECT when AI changes Tailwind config border radius', () => {
    seedFile(STITCH_HTML, 'design.html');
    run(['init', '--from', 'design.html']);

    // AI "modernizes" the radius
    const driftedHTML = STITCH_HTML
      .replace('"DEFAULT": "0.25rem"', '"DEFAULT": "0.75rem"')
      .replace('"lg": "0.5rem"', '"lg": "1rem"');
    seedFile(driftedHTML, 'design.html');

    const out = run(['check', '--threshold', '0', '--output', 'json'], { expectFail: true });
    const jsonStart = out.indexOf('{');
    const report = JSON.parse(out.slice(jsonStart));

    expect(report.passed).toBe(false);
    expect(report.changedTokens).toBeGreaterThanOrEqual(2);
    const changedProps = report.items.map((i: any) => i.original.property);
    expect(changedProps).toContain('--tw-radius-DEFAULT');
    expect(changedProps).toContain('--tw-radius-lg');
  });

  it('should DETECT when AI changes Tailwind config font family', () => {
    seedFile(STITCH_HTML, 'design.html');
    run(['init', '--from', 'design.html']);

    // AI swaps Inter for Roboto
    const driftedHTML = STITCH_HTML.replace(
      '"display": ["Inter", "sans-serif"]',
      '"display": ["Roboto", "sans-serif"]',
    );
    seedFile(driftedHTML, 'design.html');

    const out = run(['check', '--threshold', '0'], { expectFail: true });
    expect(out).toContain('--tw-font-display');
    expect(out).toContain('Roboto');
  });

  it('should DETECT mass drift: color + radius + font all changed', () => {
    seedFile(STITCH_HTML, 'design.html');
    run(['init', '--from', 'design.html']);

    // AI does a "complete redesign" while adding a feature
    const driftedHTML = STITCH_HTML
      .replace('"primary": "#256af4"', '"primary": "#e94560"')
      .replace('"background-dark": "#101622"', '"background-dark": "#1a1a2e"')
      .replace('"DEFAULT": "0.25rem"', '"DEFAULT": "1rem"')
      .replace('"lg": "0.5rem"', '"lg": "1.5rem"')
      .replace('"xl": "0.75rem"', '"xl": "2rem"')
      .replace('"display": ["Inter", "sans-serif"]', '"display": ["Poppins", "sans-serif"]');
    seedFile(driftedHTML, 'design.html');

    const out = run(['check', '--threshold', '0', '--output', 'json'], { expectFail: true });
    const jsonStart = out.indexOf('{');
    const report = JSON.parse(out.slice(jsonStart));

    expect(report.passed).toBe(false);
    expect(report.changedTokens).toBeGreaterThanOrEqual(6);

    const categories = report.items.map((i: any) => i.original.category);
    expect(categories).toContain('color');
    expect(categories).toContain('radius');
    expect(categories).toContain('font');
  });

  it('should handle Stitch → update → Stitch loop (re-sync)', () => {
    seedFile(STITCH_HTML, 'design.html');
    run(['init', '--from', 'design.html']);

    // Step 1: Verify 0% drift initially
    const clean = run(['check', '--threshold', '0']);
    expect(clean).toContain('0%');

    // Step 2: AI changes color → drift detected
    const driftedHTML = STITCH_HTML.replace('"primary": "#256af4"', '"primary": "#e94560"');
    seedFile(driftedHTML, 'design.html');
    const drift1 = run(['check', '--threshold', '0'], { expectFail: true });
    expect(drift1).toContain('--tw-primary');

    // Step 3: Revert to original → 0% restored
    seedFile(STITCH_HTML, 'design.html');
    const restored = run(['check', '--threshold', '0']);
    expect(restored).toContain('0%');

    // Step 4: Designer intentionally changes in Stitch → snapshot update
    const intentionalUpdate = STITCH_HTML.replace('"primary": "#256af4"', '"primary": "#10b981"');
    seedFile(intentionalUpdate, 'design.html');
    run(['snapshot', 'update']);

    // Step 5: After update, 0% with new baseline
    const newBaseline = run(['check', '--threshold', '0']);
    expect(newBaseline).toContain('0%');

    // Step 6: AI drifts from new baseline → detected
    const driftFromNew = STITCH_HTML.replace('"primary": "#256af4"', '"primary": "#ff0000"');
    seedFile(driftFromNew, 'design.html');
    const drift2 = run(['check', '--threshold', '0'], { expectFail: true });
    expect(drift2).toContain('--tw-primary');
  });
});
