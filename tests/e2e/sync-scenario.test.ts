import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLI_PATH = path.resolve('dist/cli/index.js');

function runCli(args: string, cwd: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`node "${CLI_PATH}" ${args}`, {
      cwd,
      encoding: 'utf-8',
      timeout: 30000,
    });
    return { stdout, exitCode: 0 };
  } catch (err: unknown) {
    const error = err as { stdout?: string; status?: number };
    return { stdout: error.stdout ?? '', exitCode: error.status ?? 1 };
  }
}

describe('CLI sync command', () => {
  let tempDir: string;
  let stitchHtmlPath: string;

  beforeAll(() => {
    // Build first
    execSync('npx tsup', { cwd: path.resolve('.'), encoding: 'utf-8' });

    // Set up temp project
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-sync-'));

    // Create Stitch HTML with Tailwind config
    stitchHtmlPath = path.join(tempDir, 'stitch-design.html');
    fs.writeFileSync(
      stitchHtmlPath,
      `<!DOCTYPE html>
<html>
<head>
  <script id="tailwind-config">
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            "primary": "#256af4",
            "secondary": "#64748b"
          },
          borderRadius: {
            "lg": "0.5rem"
          },
          fontFamily: {
            "display": ["Inter", "sans-serif"]
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --background: #ffffff;
      --foreground: #0a0a0a;
    }
  </style>
</head>
<body>
  <h1 style="color: #0a0a0a; font-family: Inter, sans-serif;">Hello</h1>
</body>
</html>`,
      'utf-8',
    );
  });

  afterAll(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should show sync help', () => {
    const result = runCli('sync --help', tempDir);
    expect(result.stdout).toContain('Synchronize design tokens');
    expect(result.stdout).toContain('--direction');
    expect(result.stdout).toContain('--stitch-html');
  });

  it('should error without a snapshot (to-stitch)', () => {
    const result = runCli('sync -d to-stitch', tempDir);
    expect(result.exitCode).not.toBe(0);
  });

  it('should generate sync prompt after drift (to-stitch)', () => {
    // 1. Init from Stitch HTML
    runCli(`init --from "${stitchHtmlPath}"`, tempDir);

    // 2. Modify the CSS (simulate AI drift)
    const cssPath = path.join(tempDir, 'styles.css');
    fs.writeFileSync(cssPath, ':root { --background: #1a1a2e; }', 'utf-8');
    // Also create a config so CSS is scanned
    const configDir = path.join(tempDir, '.design-guard');
    const configPath = path.join(configDir, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.cssFiles = ['**/*.css'];
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // 3. Run sync to-stitch
    const result = runCli('sync -d to-stitch', tempDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('to-stitch');
    expect(result.stdout).toContain('change(s) detected');
  });

  it('should output JSON format (to-stitch)', () => {
    const result = runCli('sync -d to-stitch --json', tempDir);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.direction).toBe('to-stitch');
    expect(parsed.changes).toBeDefined();
    expect(Array.isArray(parsed.changes)).toBe(true);
  });

  it('should sync from Stitch HTML (to-code)', () => {
    // Create modified Stitch HTML with changed primary
    const modifiedStitchPath = path.join(tempDir, 'stitch-modified.html');
    fs.writeFileSync(
      modifiedStitchPath,
      `<!DOCTYPE html>
<html>
<head>
  <script id="tailwind-config">
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            "primary": "#e74c3c",
            "secondary": "#64748b"
          },
          borderRadius: {
            "lg": "0.75rem"
          },
          fontFamily: {
            "display": ["Poppins", "sans-serif"]
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --background: #ffffff;
      --foreground: #0a0a0a;
    }
  </style>
</head>
<body>
  <h1 style="color: #0a0a0a; font-family: Poppins, sans-serif;">Hello</h1>
</body>
</html>`,
      'utf-8',
    );

    const result = runCli(
      `sync -d to-code --stitch-html "${modifiedStitchPath}"`,
      tempDir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('to-code');
  });

  it('should save patch file on to-code (non-dry-run)', () => {
    const patchPath = path.join(tempDir, '.design-guard', 'sync-patch.css');
    // The previous test already ran without --dry-run, so patch should exist
    expect(fs.existsSync(patchPath)).toBe(true);
    const patchContent = fs.readFileSync(patchPath, 'utf-8');
    expect(patchContent).toContain('drift-guard sync patch');
  });
});
