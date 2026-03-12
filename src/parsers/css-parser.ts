import * as csstree from 'css-tree';
import type { DesignToken, TokenCategory } from '../types/index.js';

/**
 * CSS properties that map to each token category
 */
const CATEGORY_MAP: Record<string, TokenCategory> = {
  // Colors
  'color': 'color',
  'background-color': 'color',
  'background': 'color',
  'border-color': 'color',
  'outline-color': 'color',
  'fill': 'color',
  'stroke': 'color',
  '--color': 'color',

  // Fonts
  'font-family': 'font',
  'font-size': 'font',
  'font-weight': 'font',
  'line-height': 'font',
  'letter-spacing': 'font',

  // Spacing
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
  'row-gap': 'spacing',
  'column-gap': 'spacing',

  // Shadows
  'box-shadow': 'shadow',
  'text-shadow': 'shadow',

  // Radius
  'border-radius': 'radius',
  'border-top-left-radius': 'radius',
  'border-top-right-radius': 'radius',
  'border-bottom-left-radius': 'radius',
  'border-bottom-right-radius': 'radius',

  // Layout
  'display': 'layout',
  'flex-direction': 'layout',
  'justify-content': 'layout',
  'align-items': 'layout',
  'grid-template-columns': 'layout',
  'grid-template-rows': 'layout',
  'position': 'layout',

  // Visual effects
  'backdrop-filter': 'other',
  'filter': 'other',
  'animation': 'other',
  'transition': 'other',
};

/**
 * Determine the category for a CSS property
 */
function getCategory(property: string, value?: string): TokenCategory | null {
  // Exact match
  if (CATEGORY_MAP[property]) {
    return CATEGORY_MAP[property];
  }

  // CSS custom properties (variables)
  if (property.startsWith('--')) {
    const lower = property.toLowerCase();

    // Color — keyword-based detection (expanded for Shadcn/Tailwind patterns)
    const colorKeywords = [
      'color', 'bg', 'text', 'foreground', 'background',
      // Semantic color tokens (Shadcn UI / Tailwind)
      'primary', 'secondary', 'accent', 'muted', 'destructive',
      'success', 'warning', 'danger', 'error', 'info',
      // UI component colors
      'card', 'popover', 'border', 'input', 'ring',
      'sidebar', 'chart', 'glow',
      // State colors
      'hover', 'active', 'focus', 'disabled',
    ];
    if (colorKeywords.some(kw => lower.includes(kw))) return 'color';

    // Font
    if (lower.includes('font') || lower.includes('size') || lower.includes('weight') || lower.includes('line-height') || lower.includes('letter')) return 'font';

    // Spacing
    if (lower.includes('spacing') || lower.includes('margin') || lower.includes('padding') || lower.includes('gap') || lower.includes('inset')) return 'spacing';

    // Shadow
    if (lower.includes('shadow')) return 'shadow';

    // Radius
    if (lower.includes('radius') || lower.includes('rounded')) return 'radius';

    // Layout
    if (lower.includes('width') || lower.includes('height') || lower.includes('sidebar-width')) return 'layout';

    // Value-based fallback: detect HSL bare values (e.g., "217 91% 60%") or hex/rgb/hsl
    if (value) {
      const trimmed = value.trim();
      // HSL bare format: "H S% L%" (common in Tailwind/Shadcn)
      if (/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(trimmed)) return 'color';
      // hex, rgb, hsl, oklch, color functions
      if (/^(#|rgb|hsl|oklch|lch|lab|color\()/.test(trimmed)) return 'color';
    }

    return 'other';
  }

  return null;
}

/**
 * Parse CSS content and extract design tokens
 */
export function parseCss(
  cssContent: string,
  filePath: string,
): DesignToken[] {
  const tokens: DesignToken[] = [];

  try {
    const ast = csstree.parse(cssContent, {
      filename: filePath,
      positions: true,
    });

    csstree.walk(ast, {
      visit: 'Declaration',
      enter(node) {
        const property = node.property;
        const value = csstree.generate(node.value);
        const category = getCategory(property, value);

        if (!category) return;

        // Skip empty, inherit, initial, unset
        if (!value || ['inherit', 'initial', 'unset', 'revert'].includes(value)) return;

        // Find the parent selector
        let selector = ':root';
        let parent = this.atrule ?? this.rule;
        if (parent && parent.type === 'Rule' && parent.prelude) {
          selector = csstree.generate(parent.prelude);
        }

        tokens.push({
          category,
          property,
          value: value.trim(),
          selector,
          file: filePath,
          line: node.loc?.start?.line,
        });
      },
    });
  } catch (error) {
    // If parsing fails, return what we have so far
    console.warn(`Warning: Failed to parse CSS in ${filePath}: ${(error as Error).message}`);
  }

  return tokens;
}

/**
 * Extract CSS custom properties (variables) specifically
 */
export function extractCssVariables(
  cssContent: string,
  filePath: string,
): DesignToken[] {
  const tokens: DesignToken[] = [];
  // Match --variable: value patterns
  const varRegex = /--([\w-]+)\s*:\s*([^;]+)/g;
  let match;

  while ((match = varRegex.exec(cssContent)) !== null) {
    const property = `--${match[1]}`;
    const value = match[2].trim();
    const category = getCategory(property, value) ?? 'other';

    tokens.push({
      category,
      property,
      value,
      selector: ':root',
      file: filePath,
      line: cssContent.substring(0, match.index).split('\n').length,
    });
  }

  return tokens;
}
