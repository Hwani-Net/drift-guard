import { describe, it, expect } from 'vitest';
import { parseHtml, extractStyleBlocks } from '../../src/parsers/html-parser.js';

describe('parseHtml', () => {
  it('should extract tokens from inline styles', () => {
    const html = `
      <div style="color: #333; font-size: 14px; padding: 8px;">
        Hello
      </div>
    `;
    const tokens = parseHtml(html, 'test.html');
    expect(tokens.length).toBeGreaterThanOrEqual(3);
    expect(tokens.find(t => t.property === 'color')?.value).toBe('#333');
    expect(tokens.find(t => t.property === 'font-size')?.value).toBe('14px');
    expect(tokens.find(t => t.property === 'padding')?.value).toBe('8px');
  });

  it('should categorize inline style tokens correctly', () => {
    const html = `
      <span style="color: blue; font-family: Arial; margin: 10px; border-radius: 4px; display: flex;">text</span>
    `;
    const tokens = parseHtml(html, 'test.html');
    expect(tokens.find(t => t.property === 'color')?.category).toBe('color');
    expect(tokens.find(t => t.property === 'font-family')?.category).toBe('font');
    expect(tokens.find(t => t.property === 'margin')?.category).toBe('spacing');
    expect(tokens.find(t => t.property === 'border-radius')?.category).toBe('radius');
    expect(tokens.find(t => t.property === 'display')?.category).toBe('layout');
  });

  it('should include selector info with [inline] prefix', () => {
    const html = `<div id="main" style="color: red;">text</div>`;
    const tokens = parseHtml(html, 'test.html');
    expect(tokens[0].selector).toContain('[inline]');
    expect(tokens[0].selector).toContain('div#main');
  });

  it('should use class name in selector when no id', () => {
    const html = `<div class="card primary" style="color: red;">text</div>`;
    const tokens = parseHtml(html, 'test.html');
    expect(tokens[0].selector).toContain('div.card');
  });

  it('should handle elements without style attribute', () => {
    const html = `<div><p>No styles here</p></div>`;
    const tokens = parseHtml(html, 'test.html');
    expect(tokens.length).toBe(0);
  });

  it('should handle empty HTML', () => {
    const tokens = parseHtml('', 'empty.html');
    expect(tokens).toEqual([]);
  });

  it('should handle multiple elements with styles', () => {
    const html = `
      <div style="color: red;">a</div>
      <span style="color: blue;">b</span>
      <p style="font-size: 18px;">c</p>
    `;
    const tokens = parseHtml(html, 'test.html');
    expect(tokens.length).toBe(3);
  });

  it('should set file path on all tokens', () => {
    const html = `<div style="color: red; font-size: 12px;">x</div>`;
    const tokens = parseHtml(html, 'pages/index.html');
    expect(tokens.every(t => t.file === 'pages/index.html')).toBe(true);
  });
});

describe('extractStyleBlocks', () => {
  it('should extract <style> block content', () => {
    const html = `
      <html>
        <head>
          <style>
            .btn { color: red; }
          </style>
        </head>
        <body></body>
      </html>
    `;
    const blocks = extractStyleBlocks(html);
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toContain('.btn');
    expect(blocks[0]).toContain('color: red');
  });

  it('should extract multiple <style> blocks', () => {
    const html = `
      <style>.a { color: red; }</style>
      <style>.b { color: blue; }</style>
    `;
    const blocks = extractStyleBlocks(html);
    expect(blocks.length).toBe(2);
    expect(blocks[0]).toContain('.a');
    expect(blocks[1]).toContain('.b');
  });

  it('should return empty array when no <style> blocks', () => {
    const html = `<html><body><div>No styles</div></body></html>`;
    const blocks = extractStyleBlocks(html);
    expect(blocks).toEqual([]);
  });

  it('should handle empty <style> block', () => {
    const html = `<style></style>`;
    const blocks = extractStyleBlocks(html);
    // Empty style blocks should be filtered out
    expect(blocks.length).toBe(0);
  });
});
