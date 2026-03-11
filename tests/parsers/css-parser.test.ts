import { describe, it, expect } from 'vitest';
import { parseCss, extractCssVariables } from '../../src/parsers/css-parser.js';

describe('parseCss', () => {
  it('should extract color tokens', () => {
    const css = `
      .button {
        color: #1a73e8;
        background-color: rgba(255, 255, 255, 0.9);
      }
    `;
    const tokens = parseCss(css, 'test.css');
    const colors = tokens.filter(t => t.category === 'color');
    expect(colors.length).toBeGreaterThanOrEqual(2);
    expect(colors.find(t => t.property === 'color')?.value).toBe('#1a73e8');
    expect(colors.find(t => t.property === 'background-color')?.value).toBe('rgba(255,255,255,0.9)');
  });

  it('should extract font tokens', () => {
    const css = `
      body {
        font-family: Inter, sans-serif;
        font-size: 16px;
        font-weight: 600;
        line-height: 1.5;
      }
    `;
    const tokens = parseCss(css, 'test.css');
    const fonts = tokens.filter(t => t.category === 'font');
    expect(fonts.length).toBe(4);
    expect(fonts.find(t => t.property === 'font-family')?.value).toContain('Inter');
    expect(fonts.find(t => t.property === 'font-size')?.value).toBe('16px');
    expect(fonts.find(t => t.property === 'font-weight')?.value).toBe('600');
  });

  it('should extract spacing tokens', () => {
    const css = `
      .container {
        margin: 16px;
        padding: 24px 32px;
        gap: 8px;
      }
    `;
    const tokens = parseCss(css, 'test.css');
    const spacing = tokens.filter(t => t.category === 'spacing');
    expect(spacing.length).toBe(3);
    expect(spacing.find(t => t.property === 'margin')?.value).toBe('16px');
    expect(spacing.find(t => t.property === 'gap')?.value).toBe('8px');
  });

  it('should extract shadow tokens', () => {
    const css = `
      .card {
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
    `;
    const tokens = parseCss(css, 'test.css');
    const shadows = tokens.filter(t => t.category === 'shadow');
    expect(shadows.length).toBe(1);
    expect(shadows[0].property).toBe('box-shadow');
  });

  it('should extract radius tokens', () => {
    const css = `
      .card {
        border-radius: 8px;
      }
    `;
    const tokens = parseCss(css, 'test.css');
    const radius = tokens.filter(t => t.category === 'radius');
    expect(radius.length).toBe(1);
    expect(radius[0].value).toBe('8px');
  });

  it('should extract layout tokens', () => {
    const css = `
      .flex-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
    `;
    const tokens = parseCss(css, 'test.css');
    const layout = tokens.filter(t => t.category === 'layout');
    expect(layout.length).toBe(4);
    expect(layout.find(t => t.property === 'display')?.value).toBe('flex');
  });

  it('should capture selector info', () => {
    const css = `
      .my-button { color: red; }
      #header { color: blue; }
    `;
    const tokens = parseCss(css, 'test.css');
    expect(tokens.find(t => t.selector === '.my-button')).toBeTruthy();
    expect(tokens.find(t => t.selector === '#header')).toBeTruthy();
  });

  it('should skip inherit/initial/unset values', () => {
    const css = `
      .reset {
        color: inherit;
        font-size: initial;
        margin: unset;
      }
    `;
    const tokens = parseCss(css, 'test.css');
    expect(tokens.length).toBe(0);
  });

  it('should handle empty CSS gracefully', () => {
    const tokens = parseCss('', 'empty.css');
    expect(tokens).toEqual([]);
  });

  it('should handle malformed CSS without crashing', () => {
    const css = `
      .broken {{ color: red;
      this is not valid css at all @#$%
    `;
    // Should not throw, may return partial results
    expect(() => parseCss(css, 'broken.css')).not.toThrow();
  });

  it('should set file path on tokens', () => {
    const css = `.a { color: red; }`;
    const tokens = parseCss(css, 'src/styles/main.css');
    expect(tokens.every(t => t.file === 'src/styles/main.css')).toBe(true);
  });
});

describe('extractCssVariables', () => {
  it('should extract CSS custom properties', () => {
    const css = `
      :root {
        --color-primary: #1a73e8;
        --color-bg: #ffffff;
        --font-size-base: 16px;
        --spacing-md: 16px;
      }
    `;
    const tokens = extractCssVariables(css, 'vars.css');
    expect(tokens.length).toBeGreaterThanOrEqual(4);
    expect(tokens.find(t => t.property === '--color-primary')?.value).toBe('#1a73e8');
    expect(tokens.find(t => t.property === '--color-primary')?.category).toBe('color');
    expect(tokens.find(t => t.property === '--font-size-base')?.category).toBe('font');
    expect(tokens.find(t => t.property === '--spacing-md')?.category).toBe('spacing');
  });

  it('should categorize unknown variables as other', () => {
    const css = `
      :root {
        --my-custom-var: 42px;
      }
    `;
    const tokens = extractCssVariables(css, 'test.css');
    const customVar = tokens.find(t => t.property === '--my-custom-var');
    expect(customVar?.category).toBe('other');
  });

  it('should handle empty CSS', () => {
    const tokens = extractCssVariables('', 'empty.css');
    expect(tokens).toEqual([]);
  });
});
