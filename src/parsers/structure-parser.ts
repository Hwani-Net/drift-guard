import * as cheerio from 'cheerio';
import { createHash } from 'node:crypto';
import type { StructureFingerprint } from '../types/index.js';

/**
 * Semantic HTML tags to track for structure fingerprinting
 */
const SEMANTIC_TAGS = [
  'header', 'nav', 'main', 'section', 'article',
  'aside', 'footer', 'form', 'table', 'dialog',
];

/**
 * Compute a short hash (first 8 chars of sha256)
 */
function shortHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 8);
}

/**
 * Compute the maximum DOM nesting depth via DFS
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeMaxDepth($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>, depth: number): number {
  let maxDepth = depth;

  el.children().each((_, child) => {
    if ($(child).prop('nodeType') === 1) { // Element node
      const childDepth = computeMaxDepth($, $(child), depth + 1);
      if (childDepth > maxDepth) {
        maxDepth = childDepth;
      }
    }
  });

  return maxDepth;
}

/**
 * Compute a DOM structure fingerprint from HTML content.
 *
 * Captures:
 * 1. Semantic tag counts (header, nav, main, section, etc.)
 * 2. Maximum nesting depth
 * 3. Layout element hash (elements with display:flex/grid)
 * 4. Body direct child tag sequence hash
 */
export function computeStructureFingerprint(htmlContent: string): StructureFingerprint {
  const $ = cheerio.load(htmlContent);

  // 1. Semantic tag counts
  const semanticTags: Record<string, number> = {};
  for (const tag of SEMANTIC_TAGS) {
    const count = $(tag).length;
    if (count > 0) {
      semanticTags[tag] = count;
    }
  }

  // 2. Max nesting depth
  const body = $('body');
  const maxDepth = body.length > 0
    ? computeMaxDepth($, body, 0)
    : 0;

  // 3. Layout element hash — elements with display:flex or display:grid in inline styles
  const layoutElements: string[] = [];
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') ?? '';
    if (/display\s*:\s*(flex|grid|inline-flex|inline-grid)/i.test(style)) {
      const tag = ($(el).prop('tagName') ?? 'div').toLowerCase();
      const cls = $(el).attr('class') ?? '';
      layoutElements.push(`${tag}.${cls}`);
    }
  });

  // Also capture elements with layout-related class names (Tailwind patterns)
  $('[class*="flex"], [class*="grid"]').each((_, el) => {
    const tag = ($(el).prop('tagName') ?? 'div').toLowerCase();
    const cls = $(el).attr('class') ?? '';
    // Only include if it has actual flex/grid class
    if (/\b(flex|grid|inline-flex|inline-grid)\b/.test(cls)) {
      const key = `${tag}.${cls}`;
      if (!layoutElements.includes(key)) {
        layoutElements.push(key);
      }
    }
  });

  layoutElements.sort();
  const layoutHash = layoutElements.length > 0
    ? shortHash(layoutElements.join('|'))
    : 'empty';

  // 4. Body direct child tag sequence
  const childTags: string[] = [];
  body.children().each((_, child) => {
    if ($(child).prop('nodeType') === 1) { // Element node
      const tag = ($(child).prop('tagName') ?? '').toLowerCase();
      if (tag && tag !== 'script' && tag !== 'link') {
        childTags.push(tag);
      }
    }
  });

  const childSequenceHash = childTags.length > 0
    ? shortHash(childTags.join(','))
    : 'empty';

  return {
    semanticTags,
    maxDepth,
    layoutHash,
    childSequenceHash,
  };
}

/**
 * Compare two structure fingerprints and return human-readable differences
 */
export function compareStructure(
  original: StructureFingerprint,
  current: StructureFingerprint,
): string[] {
  const details: string[] = [];

  // Compare max depth
  if (original.maxDepth !== current.maxDepth) {
    details.push(`maxDepth: ${original.maxDepth} → ${current.maxDepth}`);
  }

  // Compare semantic tag counts
  const allTags = new Set([
    ...Object.keys(original.semanticTags),
    ...Object.keys(current.semanticTags),
  ]);

  for (const tag of allTags) {
    const origCount = original.semanticTags[tag] ?? 0;
    const currCount = current.semanticTags[tag] ?? 0;
    if (origCount !== currCount) {
      if (origCount === 0) {
        details.push(`<${tag}> added (${currCount})`);
      } else if (currCount === 0) {
        details.push(`<${tag}> removed (was ${origCount})`);
      } else {
        details.push(`<${tag}> count: ${origCount} → ${currCount}`);
      }
    }
  }

  // Compare layout hash
  if (original.layoutHash !== current.layoutHash) {
    details.push(`layout elements changed (hash: ${original.layoutHash} → ${current.layoutHash})`);
  }

  // Compare child sequence hash
  if (original.childSequenceHash !== current.childSequenceHash) {
    details.push(`body child sequence changed (hash: ${original.childSequenceHash} → ${current.childSequenceHash})`);
  }

  return details;
}
