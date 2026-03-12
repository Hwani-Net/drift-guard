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

  // Visual effects
  'backdrop-filter': 'other',
  'filter': 'other',
  'animation': 'other',
  'transition': 'other',
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
 * Extract design tokens from Tailwind config in <script> tags.
 * Stitch generates HTML with tailwind config like:
 *   <script id="tailwind-config">
 *     tailwind.config = { theme: { extend: { colors: { "primary": "#256af4" }, ... } } }
 *   </script>
 */
export function extractTailwindConfig(
  htmlContent: string,
  filePath: string,
): DesignToken[] {
  const tokens: DesignToken[] = [];
  const $ = cheerio.load(htmlContent);

  // Find script tags that contain tailwind config
  $('script').each((_, el) => {
    const scriptId = $(el).attr('id') ?? '';
    const text = $(el).text();
    if (!text) return;

    // Match scripts with id="tailwind-config" or containing "tailwind.config"
    const isTailwindConfig =
      scriptId.toLowerCase().includes('tailwind') ||
      text.includes('tailwind.config');

    if (!isTailwindConfig) return;

    // Extract colors
    const colorsMatch = text.match(/colors\s*:\s*\{([^}]+)\}/);
    if (colorsMatch) {
      const colorsBlock = colorsMatch[1];
      const colorRegex = /["']([^"']+)["']\s*:\s*["']([^"']+)["']/g;
      let match;
      while ((match = colorRegex.exec(colorsBlock)) !== null) {
        tokens.push({
          category: 'color',
          property: `--tw-${match[1]}`,
          value: match[2],
          selector: '[tailwind.config]',
          file: filePath,
        });
      }
    }

    // Extract borderRadius
    const radiusMatch = text.match(/borderRadius\s*:\s*\{([^}]+)\}/);
    if (radiusMatch) {
      const radiusBlock = radiusMatch[1];
      const radiusRegex = /["']([^"']+)["']\s*:\s*["']([^"']+)["']/g;
      let match;
      while ((match = radiusRegex.exec(radiusBlock)) !== null) {
        tokens.push({
          category: 'radius',
          property: `--tw-radius-${match[1]}`,
          value: match[2],
          selector: '[tailwind.config]',
          file: filePath,
        });
      }
    }

    // Extract fontFamily
    const fontMatch = text.match(/fontFamily\s*:\s*\{([^}]+)\}/);
    if (fontMatch) {
      const fontBlock = fontMatch[1];
      // Match: "display": ["Inter", "sans-serif"] or "body": ["Roboto"]
      const fontRegex = /["']([^"']+)["']\s*:\s*\[([^\]]+)\]/g;
      let match;
      while ((match = fontRegex.exec(fontBlock)) !== null) {
        const familyValues = match[2]
          .split(',')
          .map(v => v.trim().replace(/["']/g, ''))
          .join(', ');
        tokens.push({
          category: 'font',
          property: `--tw-font-${match[1]}`,
          value: familyValues,
          selector: '[tailwind.config]',
          file: filePath,
        });
      }
    }
  });

  return tokens;
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
