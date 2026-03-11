import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { generateRules, saveRules } from '../../src/core/rules-generator.js';
import type { DesignSnapshot, RuleFormat } from '../../src/types/index.js';

const mockSnapshot: DesignSnapshot = {
  version: '1.0.0',
  createdAt: '2026-03-11T00:00:00.000Z',
  projectRoot: '/test',
  sourceFiles: ['src/main.css'],
  tokens: [
    { category: 'color', property: 'color', value: '#1a73e8', selector: '.btn', file: 'src/main.css', line: 1 },
    { category: 'color', property: 'background-color', value: '#ffffff', selector: '.card', file: 'src/main.css', line: 2 },
    { category: 'font', property: 'font-family', value: 'Inter, sans-serif', selector: 'body', file: 'src/main.css', line: 3 },
    { category: 'font', property: 'font-size', value: '16px', selector: 'body', file: 'src/main.css', line: 4 },
    { category: 'spacing', property: 'padding', value: '16px 24px', selector: '.container', file: 'src/main.css', line: 5 },
    { category: 'radius', property: 'border-radius', value: '8px', selector: '.card', file: 'src/main.css', line: 6 },
  ],
  summary: { color: 2, font: 2, spacing: 1, shadow: 0, radius: 1, layout: 0, other: 0 },
};

describe('generateRules', () => {
  const formats: RuleFormat[] = ['cursorrules', 'claude-md', 'agents-md', 'copilot', 'clinerules'];

  for (const format of formats) {
    it(`should generate valid ${format} rules`, () => {
      const result = generateRules(mockSnapshot, format);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // All formats should mention design tokens
      expect(result.toLowerCase()).toContain('color');
      expect(result).toContain('#1a73e8');
    });
  }

  it('cursorrules should contain protection rules', () => {
    const rules = generateRules(mockSnapshot, 'cursorrules');
    expect(rules).toContain('DO NOT');
    expect(rules).toContain('Design Guard');
    expect(rules).toContain('drift-guard');
    expect(rules).toContain('font-family');
  });

  it('claude-md should contain npx check command', () => {
    const rules = generateRules(mockSnapshot, 'claude-md');
    expect(rules).toContain('npx drift-guard check');
  });

  it('agents-md should contain token count', () => {
    const rules = generateRules(mockSnapshot, 'agents-md');
    expect(rules).toContain(String(mockSnapshot.tokens.length));
  });

  it('clinerules should contain DESIGN_PROTECTION=true', () => {
    const rules = generateRules(mockSnapshot, 'clinerules');
    expect(rules).toContain('DESIGN_PROTECTION=true');
  });
});

describe('saveRules', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-guard-rules-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should save cursorrules file', () => {
    const content = generateRules(mockSnapshot, 'cursorrules');
    const filePath = saveRules(tmpDir, 'cursorrules', content);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(filePath).toContain('.cursorrules');
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
  });

  it('should save CLAUDE.md', () => {
    const content = generateRules(mockSnapshot, 'claude-md');
    const filePath = saveRules(tmpDir, 'claude-md', content);
    expect(path.basename(filePath)).toBe('CLAUDE.md');
  });

  it('should create .github directory for copilot', () => {
    const content = generateRules(mockSnapshot, 'copilot');
    const filePath = saveRules(tmpDir, 'copilot', content);
    expect(filePath).toContain('.github');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('should append to existing file when append=true', () => {
    const initial = 'EXISTING CONTENT\n';
    const filePath = path.join(tmpDir, '.cursorrules');
    fs.writeFileSync(filePath, initial);

    const rules = generateRules(mockSnapshot, 'cursorrules');
    saveRules(tmpDir, 'cursorrules', rules, true);

    const result = fs.readFileSync(filePath, 'utf-8');
    expect(result).toContain('EXISTING CONTENT');
    expect(result).toContain('Design Guard');
  });

  it('should overwrite existing file when append=false', () => {
    const initial = 'OLD CONTENT\n';
    const filePath = path.join(tmpDir, '.cursorrules');
    fs.writeFileSync(filePath, initial);

    const rules = generateRules(mockSnapshot, 'cursorrules');
    saveRules(tmpDir, 'cursorrules', rules, false);

    const result = fs.readFileSync(filePath, 'utf-8');
    expect(result).not.toContain('OLD CONTENT');
    expect(result).toContain('Design Guard');
  });
});
