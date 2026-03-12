import { describe, it, expect } from 'vitest';
import {
  driftItemsToSyncChanges,
  generateSyncPrompt,
  syncToStitch,
  syncFromStitch,
} from '../../src/core/sync.js';
import type { DriftItem, DesignToken } from '../../src/types/index.js';

describe('driftItemsToSyncChanges', () => {
  it('should convert modified items to update changes', () => {
    const items: DriftItem[] = [
      {
        original: { category: 'color', property: '--primary', value: '#256af4', selector: ':root', file: 'a.css' },
        current: { category: 'color', property: '--primary', value: '#6c5ce7', selector: ':root', file: 'a.css' },
        changeType: 'modified',
      },
    ];
    const changes = driftItemsToSyncChanges(items);
    expect(changes).toHaveLength(1);
    expect(changes[0].action).toBe('update');
    expect(changes[0].fromValue).toBe('#256af4');
    expect(changes[0].toValue).toBe('#6c5ce7');
    expect(changes[0].category).toBe('color');
  });

  it('should convert deleted items to remove changes', () => {
    const items: DriftItem[] = [
      {
        original: { category: 'font', property: '--font-body', value: 'Inter', selector: ':root', file: 'a.css' },
        current: null,
        changeType: 'deleted',
      },
    ];
    const changes = driftItemsToSyncChanges(items);
    expect(changes).toHaveLength(1);
    expect(changes[0].action).toBe('remove');
    expect(changes[0].fromValue).toBe('Inter');
    expect(changes[0].toValue).toBe('');
  });

  it('should convert added items to add changes', () => {
    const items: DriftItem[] = [
      {
        original: { category: 'spacing', property: '--gap-xl', value: '2rem', selector: ':root', file: 'a.css' },
        current: { category: 'spacing', property: '--gap-xl', value: '2rem', selector: ':root', file: 'a.css' },
        changeType: 'added',
      },
    ];
    const changes = driftItemsToSyncChanges(items);
    expect(changes).toHaveLength(1);
    expect(changes[0].action).toBe('add');
    expect(changes[0].toValue).toBe('2rem');
  });
});

describe('generateSyncPrompt', () => {
  it('should generate a prompt from changes', () => {
    const changes = [
      { category: 'color' as const, property: '--tw-primary', fromValue: '#256af4', toValue: '#6c5ce7', action: 'update' as const },
      { category: 'font' as const, property: '--tw-font-display', fromValue: 'Inter', toValue: 'Poppins', action: 'update' as const },
    ];
    const prompt = generateSyncPrompt(changes);
    expect(prompt).toContain('primary');
    expect(prompt).toContain('#256af4');
    expect(prompt).toContain('#6c5ce7');
    expect(prompt).toContain('Poppins');
    expect(prompt).toContain('Update the following design tokens');
  });

  it('should return empty string for no changes', () => {
    const prompt = generateSyncPrompt([]);
    expect(prompt).toBe('');
  });

  it('should group changes by category', () => {
    const changes = [
      { category: 'color' as const, property: '--primary', fromValue: '#aaa', toValue: '#bbb', action: 'update' as const },
      { category: 'color' as const, property: '--secondary', fromValue: '#ccc', toValue: '#ddd', action: 'update' as const },
      { category: 'font' as const, property: '--font-body', fromValue: 'Arial', toValue: 'Roboto', action: 'update' as const },
    ];
    const prompt = generateSyncPrompt(changes);
    // All color changes should appear before font changes
    const colorIdx = prompt.indexOf('color');
    const fontIdx = prompt.indexOf('font');
    expect(colorIdx).toBeLessThan(fontIdx);
  });

  it('should include add and remove actions', () => {
    const changes = [
      { category: 'radius' as const, property: '--radius-xl', fromValue: '', toValue: '1.5rem', action: 'add' as const },
      { category: 'shadow' as const, property: '--shadow-sm', fromValue: '0 1px 2px rgba(0,0,0,0.1)', toValue: '', action: 'remove' as const },
    ];
    const prompt = generateSyncPrompt(changes);
    expect(prompt).toContain('Add new');
    expect(prompt).toContain('Remove');
  });
});

describe('syncToStitch', () => {
  it('should return SyncResult with prompt and changes', () => {
    const items: DriftItem[] = [
      {
        original: { category: 'color', property: '--tw-primary', value: '#256af4', selector: '[tailwind.config]', file: 'stitch.html' },
        current: { category: 'color', property: '--tw-primary', value: '#6c5ce7', selector: '[tailwind.config]', file: 'stitch.html' },
        changeType: 'modified',
      },
    ];
    const result = syncToStitch(items);
    expect(result.direction).toBe('to-stitch');
    expect(result.changes).toHaveLength(1);
    expect(result.prompt).toBeDefined();
    expect(result.prompt).toContain('#6c5ce7');
    expect(result.timestamp).toBeDefined();
  });

  it('should return no prompt when no changes', () => {
    const result = syncToStitch([]);
    expect(result.direction).toBe('to-stitch');
    expect(result.changes).toHaveLength(0);
    expect(result.prompt).toBeUndefined();
  });
});

describe('syncFromStitch', () => {
  it('should detect updated tokens between Stitch and snapshot', () => {
    const stitchTokens: DesignToken[] = [
      { category: 'color', property: '--primary', value: '#ff0000', selector: ':root', file: 'stitch.html' },
    ];
    const snapshotTokens: DesignToken[] = [
      { category: 'color', property: '--primary', value: '#256af4', selector: ':root', file: 'globals.css' },
    ];
    const result = syncFromStitch(stitchTokens, snapshotTokens);
    expect(result.direction).toBe('to-code');
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].action).toBe('update');
    expect(result.changes[0].fromValue).toBe('#256af4');
    expect(result.changes[0].toValue).toBe('#ff0000');
  });

  it('should detect added tokens in Stitch', () => {
    const stitchTokens: DesignToken[] = [
      { category: 'color', property: '--accent', value: '#e74c3c', selector: ':root', file: 'stitch.html' },
    ];
    const result = syncFromStitch(stitchTokens, []);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].action).toBe('add');
  });

  it('should detect removed tokens from Stitch', () => {
    // Provide at least one Stitch design token so deletion detection activates
    // Only --tw-* prefixed (Stitch-origin) tokens trigger removal
    const stitchTokens: DesignToken[] = [
      { category: 'color', property: '--tw-primary', value: '#256af4', selector: '[tailwind.config]', file: 'stitch.html' },
    ];
    const snapshotTokens: DesignToken[] = [
      { category: 'color', property: '--tw-primary', value: '#256af4', selector: '[tailwind.config]', file: 'stitch.html' },
      { category: 'font', property: '--tw-font-mono', value: 'Fira Code', selector: '[tailwind.config]', file: 'stitch.html' },
    ];
    const result = syncFromStitch(stitchTokens, snapshotTokens);
    // --tw-primary matches, --tw-font-mono is Stitch-origin but missing → remove
    const removes = result.changes.filter(c => c.action === 'remove');
    expect(removes).toHaveLength(1);
    expect(removes[0].property).toBe('--tw-font-mono');
  });

  it('should generate CSS patch content', () => {
    const stitchTokens: DesignToken[] = [
      { category: 'color', property: '--primary', value: '#new', selector: ':root', file: 'stitch.html' },
    ];
    const snapshotTokens: DesignToken[] = [
      { category: 'color', property: '--primary', value: '#old', selector: ':root', file: 'globals.css' },
    ];
    const result = syncFromStitch(stitchTokens, snapshotTokens);
    expect(result.patchFile).toBeDefined();
    expect(result.patchFile).toContain('--primary: #new');
    expect(result.patchFile).toContain('was: #old');
  });

  it('should return no patch when Stitch and code match', () => {
    const tokens: DesignToken[] = [
      { category: 'color', property: '--primary', value: '#same', selector: ':root', file: 'a.css' },
    ];
    const result = syncFromStitch(tokens, tokens);
    expect(result.changes).toHaveLength(0);
    expect(result.patchFile).toBeUndefined();
  });
});
