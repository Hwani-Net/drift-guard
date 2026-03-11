import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { detectDrift } from '../../src/core/drift.js';
import { createSnapshot, saveConfig } from '../../src/core/snapshot.js';
import type { DesignSnapshot, DriftGuardConfig } from '../../src/types/index.js';

let tmpDir: string;
const baseConfig: DriftGuardConfig = {
  cssFiles: ['src/**/*.css'],
  htmlFiles: [],
  threshold: 10,
  trackCategories: ['color', 'font', 'spacing', 'shadow', 'radius', 'layout'],
  ignore: ['node_modules/**'],
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-guard-drift-'));
  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  saveConfig(tmpDir, baseConfig);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('detectDrift', () => {
  it('should report 0% drift when nothing changed', async () => {
    const css = `.btn { color: #1a73e8; font-size: 14px; padding: 8px; }`;
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.css'), css);

    const snapshot = await createSnapshot(tmpDir);
    const report = await detectDrift(tmpDir, snapshot, 10);

    expect(report.driftScore).toBe(0);
    expect(report.passed).toBe(true);
    expect(report.changedTokens).toBe(0);
    expect(report.items.length).toBe(0);
  });

  it('should detect modified tokens', async () => {
    const originalCss = `.btn { color: #1a73e8; font-size: 14px; }`;
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.css'), originalCss);

    const snapshot = await createSnapshot(tmpDir);

    // Simulate AI drift: change the color
    const modifiedCss = `.btn { color: #ff0000; font-size: 14px; }`;
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.css'), modifiedCss);

    const report = await detectDrift(tmpDir, snapshot, 10);

    expect(report.changedTokens).toBeGreaterThan(0);
    expect(report.driftScore).toBeGreaterThan(0);
    expect(report.items.some(i => i.changeType === 'modified')).toBe(true);
    expect(report.items.find(i => i.changeType === 'modified')?.original.value).toBe('#1a73e8');
    expect(report.items.find(i => i.changeType === 'modified')?.current?.value).toBe('#ff0000');
  });

  it('should detect deleted tokens', async () => {
    const originalCss = `.btn { color: #1a73e8; font-size: 14px; padding: 8px; }`;
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.css'), originalCss);

    const snapshot = await createSnapshot(tmpDir);

    // Remove some properties
    const reducedCss = `.btn { color: #1a73e8; }`;
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.css'), reducedCss);

    const report = await detectDrift(tmpDir, snapshot, 10);

    expect(report.items.some(i => i.changeType === 'deleted')).toBe(true);
    expect(report.changedTokens).toBeGreaterThan(0);
  });

  it('should respect threshold setting', async () => {
    const css = `.a { color: red; } .b { color: blue; } .c { color: green; } .d { font-size: 10px; }`;
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.css'), css);
    const snapshot = await createSnapshot(tmpDir);

    // Change 1 out of 4 tokens = 25%
    const modified = `.a { color: purple; } .b { color: blue; } .c { color: green; } .d { font-size: 10px; }`;
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.css'), modified);

    const report10 = await detectDrift(tmpDir, snapshot, 10);
    expect(report10.passed).toBe(false);

    const report50 = await detectDrift(tmpDir, snapshot, 50);
    expect(report50.passed).toBe(true);
  });

  it('should include category summary', async () => {
    const css = `.x { color: red; font-size: 14px; padding: 8px; border-radius: 4px; }`;
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.css'), css);
    const snapshot = await createSnapshot(tmpDir);

    const report = await detectDrift(tmpDir, snapshot, 10);
    expect(report.categorySummary).toHaveProperty('color');
    expect(report.categorySummary).toHaveProperty('font');
    expect(report.categorySummary).toHaveProperty('spacing');
    expect(report.categorySummary).toHaveProperty('radius');
    expect(report.categorySummary.color.total).toBeGreaterThan(0);
  });

  it('should handle empty snapshot gracefully', async () => {
    const emptySnapshot: DesignSnapshot = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      projectRoot: tmpDir,
      sourceFiles: [],
      tokens: [],
      summary: { color: 0, font: 0, spacing: 0, shadow: 0, radius: 0, layout: 0, other: 0 },
    };

    fs.writeFileSync(path.join(tmpDir, 'src', 'main.css'), `.a { color: red; }`);
    const report = await detectDrift(tmpDir, emptySnapshot, 10);

    expect(report.driftScore).toBe(0);
    expect(report.passed).toBe(true);
  });
});
