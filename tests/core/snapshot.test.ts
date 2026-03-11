import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  createSnapshot,
  saveSnapshot,
  loadSnapshot,
  loadConfig,
  saveConfig,
  getSnapshotPath,
} from '../../src/core/snapshot.js';
import type { DriftGuardConfig } from '../../src/types/index.js';

// Use a temporary directory for tests
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-guard-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadConfig / saveConfig', () => {
  it('should return default config when no config file exists', () => {
    const config = loadConfig(tmpDir);
    expect(config.threshold).toBe(10);
    expect(config.cssFiles).toContain('src/**/*.css');
    expect(config.trackCategories).toContain('color');
  });

  it('should save and load config', () => {
    const custom: DriftGuardConfig = {
      cssFiles: ['styles/**/*.css'],
      htmlFiles: ['**/*.html'],
      threshold: 5,
      trackCategories: ['color', 'font'],
      ignore: ['node_modules/**'],
    };
    saveConfig(tmpDir, custom);
    const loaded = loadConfig(tmpDir);
    expect(loaded.threshold).toBe(5);
    expect(loaded.cssFiles).toEqual(['styles/**/*.css']);
  });

  it('should create .design-guard directory if it does not exist', () => {
    const custom: DriftGuardConfig = {
      cssFiles: [],
      htmlFiles: [],
      threshold: 10,
      trackCategories: [],
      ignore: [],
    };
    saveConfig(tmpDir, custom);
    expect(fs.existsSync(path.join(tmpDir, '.design-guard'))).toBe(true);
  });
});

describe('createSnapshot', () => {
  it('should create a snapshot from CSS files', async () => {
    // Set up a mini project
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, 'main.css'),
      `.btn { color: #1a73e8; font-size: 14px; padding: 8px 16px; border-radius: 4px; }`,
    );

    const config: DriftGuardConfig = {
      cssFiles: ['src/**/*.css'],
      htmlFiles: [],
      threshold: 10,
      trackCategories: ['color', 'font', 'spacing', 'radius', 'shadow', 'layout'],
      ignore: ['node_modules/**'],
    };
    saveConfig(tmpDir, config);

    const snapshot = await createSnapshot(tmpDir);
    expect(snapshot.version).toBe('1.0.0');
    expect(snapshot.tokens.length).toBeGreaterThan(0);
    expect(snapshot.sourceFiles).toContain('src/main.css');
    expect(snapshot.summary.color).toBeGreaterThan(0);
  });

  it('should handle projects with no CSS files', async () => {
    const config: DriftGuardConfig = {
      cssFiles: ['nonexistent/**/*.css'],
      htmlFiles: [],
      threshold: 10,
      trackCategories: ['color'],
      ignore: [],
    };
    saveConfig(tmpDir, config);

    const snapshot = await createSnapshot(tmpDir);
    expect(snapshot.tokens.length).toBe(0);
    expect(snapshot.sourceFiles.length).toBe(0);
  });
});

describe('saveSnapshot / loadSnapshot', () => {
  it('should save and load a snapshot', async () => {
    const srcDir = path.join(tmpDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'app.css'), `.card { color: #333; }`);

    const config: DriftGuardConfig = {
      cssFiles: ['src/**/*.css'],
      htmlFiles: [],
      threshold: 10,
      trackCategories: ['color', 'font', 'spacing', 'shadow', 'radius', 'layout'],
      ignore: [],
    };
    saveConfig(tmpDir, config);

    const snapshot = await createSnapshot(tmpDir);
    const savedPath = saveSnapshot(tmpDir, snapshot);

    expect(fs.existsSync(savedPath)).toBe(true);

    const loaded = loadSnapshot(tmpDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.tokens.length).toBe(snapshot.tokens.length);
    expect(loaded!.createdAt).toBe(snapshot.createdAt);
  });

  it('should return null when no snapshot exists', () => {
    const result = loadSnapshot(tmpDir);
    expect(result).toBeNull();
  });

  it('getSnapshotPath should return correct path', () => {
    const p = getSnapshotPath(tmpDir);
    expect(p).toContain('.design-guard');
    expect(p).toContain('snapshot.json');
  });
});
