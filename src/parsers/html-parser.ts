import * as cheerio from 'cheerio';
import type { DesignToken, TokenCategory } from '../types/index.js';

/**
 * Style properties we want to extract from inline styles
 */
const TRACKED_PROPERTIES: Record<string, TokenCategory> = {
  'color': 'color',
  'background-color': 'color',
  'background': 'color',
  'border-color': 'color',
  'font-family': 'font',
  'font-size': 'font',
  'font-weight': 'font',
  'line-height': 'font',
  'margin': 'spacing',
  'margin-top': 'spacing',
  'margin-right': 'spacing',
  'margin-bottom': 'spacing',
  'margin-left': 'spacing',
  'padding': 'spacing',
  'padding-top': 'spacing',
  'padding-right': 'spacing',
  'padding-bottom': 'spacing',
  'padding-left': 'spacing',
  'gap': 'spacing',
  'box-shadow': 'shadow',
  'text-shadow': 'shadow',
  'border-radius': 'radius',
  'display': 'layout',
  'flex-direction': 'layout',
  'justify-content': 'layout',
  'align-items': 'layout',
};

/**
 * Parse inline styles from a style attribute string
 */
function parseInlineStyle(styleStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  const declarations = styleStr.split(';').filter(Boolean);

  for (const decl of declarations) {
    const colonIdx = decl.indexOf(':');
    if (colonIdx === -1) continue;

    const prop = decl.substring(0, colonIdx).trim().toLowerCase();
    const val = decl.substring(colonIdx + 1).trim();

    if (prop && val) {
      result[prop] = val;
    }
  }

  return result;
}

/**
 * Parse HTML content and extract design tokens from:
 * 1. <style> blocks
 * 2. Inline style attributes
 */
export function parseHtml(
  htmlContent: string,
  filePath: string,
): DesignToken[] {
  const tokens: DesignToken[] = [];
  const $ = cheerio.load(htmlContent);

  // 1. Extract from <style> blocks (will be handled by CSS parser upstream)
  // We return them separately as raw CSS strings
  const styleBlocks: string[] = [];
  $('style').each((_, el) => {
    const text = $(el).text();
    if (text) {
      styleBlocks.push(text);
    }
  });

  // 2. Extract from inline style attributes
  $('[style]').each((_, el) => {
    const element = $(el);
    const styleStr = element.attr('style');
    if (!styleStr) return;

    const selector = buildSelectorPath($, element);
    const styles = parseInlineStyle(styleStr);

    for (const [prop, value] of Object.entries(styles)) {
      const category = TRACKED_PROPERTIES[prop];
      if (!category) continue;

      tokens.push({
        category,
        property: prop,
        value,
        selector: `[inline] ${selector}`,
        file: filePath,
      });
    }
  });

  return tokens;
}

/**
 * Extract raw CSS from <style> blocks in HTML
 */
export function extractStyleBlocks(htmlContent: string): string[] {
  const $ = cheerio.load(htmlContent);
  const blocks: string[] = [];

  $('style').each((_, el) => {
    const text = $(el).text();
    if (text) {
      blocks.push(text);
    }
  });

  return blocks;
}

/**
 * Build a human-readable selector path for an element
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSelectorPath($: cheerio.CheerioAPI, element: any): string {
  const parts: string[] = [];
  const tagName = element.prop('tagName')?.toLowerCase() ?? 'div';
  const id = element.attr('id');
  const className = element.attr('class');

  let sel = tagName;
  if (id) {
    sel += `#${id}`;
  } else if (className) {
    const classList = className.split(/\s+/).slice(0, 2).join('.');
    sel += `.${classList}`;
  }

  parts.push(sel);
  return parts.join(' > ');
}
