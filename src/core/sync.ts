import type {
  DriftItem,
  DesignToken,
  SyncChange,
  SyncResult,
  SyncDirection,
  TokenCategory,
} from '../types/index.js';

/**
 * Human-readable labels for token categories
 */
const CATEGORY_LABELS: Record<TokenCategory, string> = {
  color: 'color',
  font: 'font',
  spacing: 'spacing',
  shadow: 'shadow',
  radius: 'border-radius',
  layout: 'layout',
  other: 'style',
};

/**
 * Properties that are design tokens (CSS custom properties or Tailwind config).
 * Inline style properties like 'display', 'align-items' are NOT design tokens.
 */
function isDesignTokenProperty(property: string): boolean {
  // CSS custom properties (--*) and Tailwind config tokens (--tw-*)
  if (property.startsWith('--')) return true;
  // font-family is a design token
  if (property === 'font-family') return true;
  return false;
}

/**
 * Normalize a token key for matching across Stitch HTML and code CSS.
 * Maps between different naming conventions:
 *   Stitch Tailwind config: --tw-primary
 *   Code CSS variable:      --primary
 */
function normalizeTokenKey(property: string): string {
  return property
    .replace(/^--tw-/, '--')     // --tw-primary → --primary
    .replace(/^--tw-font-/, '--font-') // --tw-font-display → --font-display
    .toLowerCase();
}

/**
 * Convert DriftItems into SyncChanges
 */
export function driftItemsToSyncChanges(items: DriftItem[]): SyncChange[] {
  return items.map((item) => {
    if (item.changeType === 'deleted') {
      return {
        category: item.original.category,
        property: item.original.property,
        fromValue: item.original.value,
        toValue: '',
        action: 'remove' as const,
      };
    }

    if (item.changeType === 'added') {
      return {
        category: (item.current ?? item.original).category,
        property: (item.current ?? item.original).property,
        fromValue: '',
        toValue: (item.current ?? item.original).value,
        action: 'add' as const,
      };
    }

    // modified
    return {
      category: item.original.category,
      property: item.original.property,
      fromValue: item.original.value,
      toValue: item.current?.value ?? '',
      action: 'update' as const,
    };
  });
}

/**
 * Generate a natural language prompt from sync changes.
 * This prompt is designed for Stitch's `edit_screens` API.
 */
export function generateSyncPrompt(changes: SyncChange[]): string {
  if (changes.length === 0) {
    return '';
  }

  // Group changes by category
  const grouped = new Map<TokenCategory, SyncChange[]>();
  for (const change of changes) {
    const existing = grouped.get(change.category) ?? [];
    existing.push(change);
    grouped.set(change.category, existing);
  }

  const lines: string[] = [
    'Update the following design tokens to match the latest code changes:',
    '',
  ];

  for (const [category, categoryChanges] of grouped) {
    const label = CATEGORY_LABELS[category];

    for (const change of categoryChanges) {
      const propName = cleanPropertyName(change.property);

      if (change.action === 'update') {
        lines.push(
          `- Change ${label} '${propName}' from ${change.fromValue} to ${change.toValue}`,
        );
      } else if (change.action === 'add') {
        lines.push(
          `- Add new ${label} '${propName}' with value ${change.toValue}`,
        );
      } else if (change.action === 'remove') {
        lines.push(
          `- Remove ${label} '${propName}' (was ${change.fromValue})`,
        );
      }
    }
  }

  lines.push('');
  lines.push(
    'Keep all other design elements unchanged. Only modify the specified tokens.',
  );

  return lines.join('\n');
}

/**
 * Clean up property names for human-readable prompts.
 */
function cleanPropertyName(property: string): string {
  return property
    .replace(/^--tw-/, '')
    .replace(/^--tw-radius-/, '')
    .replace(/^--tw-font-/, '')
    .replace(/^--/, '');
}

/**
 * Build a SyncResult for pushing code changes to Stitch.
 */
export function syncToStitch(driftItems: DriftItem[]): SyncResult {
  const changes = driftItemsToSyncChanges(driftItems);
  const prompt = generateSyncPrompt(changes);

  return {
    direction: 'to-stitch' as SyncDirection,
    changes,
    prompt: prompt || undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a SyncResult for pulling Stitch changes to code.
 *
 * ONLY compares design tokens that exist in BOTH Stitch and snapshot.
 * Code-only tokens (e.g., Shadcn --background, --sidebar) are NOT
 * flagged as "removed" — Stitch doesn't own them.
 */
export function syncFromStitch(
  stitchTokens: DesignToken[],
  snapshotTokens: DesignToken[],
): SyncResult {
  const changes: SyncChange[] = [];

  // Filter to design-token-only properties
  const stitchDesignTokens = stitchTokens.filter(t => isDesignTokenProperty(t.property));
  const snapshotDesignTokens = snapshotTokens.filter(t => isDesignTokenProperty(t.property));

  // Build normalized lookup maps
  const snapshotMap = new Map<string, DesignToken>();
  for (const token of snapshotDesignTokens) {
    const key = normalizeTokenKey(token.property);
    if (!snapshotMap.has(key)) {
      snapshotMap.set(key, token);
    }
  }

  const stitchMap = new Map<string, DesignToken>();
  for (const token of stitchDesignTokens) {
    const key = normalizeTokenKey(token.property);
    if (!stitchMap.has(key)) {
      stitchMap.set(key, token);
    }
  }

  // Find updates and adds: stitch token differs or new
  for (const [key, stitchToken] of stitchMap) {
    const snapshotToken = snapshotMap.get(key);

    if (!snapshotToken) {
      changes.push({
        category: stitchToken.category,
        property: stitchToken.property,
        fromValue: '',
        toValue: stitchToken.value,
        action: 'add',
      });
    } else if (stitchToken.value !== snapshotToken.value) {
      changes.push({
        category: stitchToken.category,
        property: snapshotToken.property,
        fromValue: snapshotToken.value,
        toValue: stitchToken.value,
        action: 'update',
      });
    }
  }

  // Removals: only flag tokens that are clearly Stitch-origin
  // (i.e., --tw-* prefixed in snapshot AND missing from stitch)
  // This avoids false-flagging code-only tokens like --background
  if (stitchDesignTokens.length > 0) {
    for (const [key, snapshotToken] of snapshotMap) {
      const isStitchOrigin = snapshotToken.property.startsWith('--tw-')
        || snapshotToken.selector === '[tailwind.config]';
      if (isStitchOrigin && !stitchMap.has(key)) {
        changes.push({
          category: snapshotToken.category,
          property: snapshotToken.property,
          fromValue: snapshotToken.value,
          toValue: '',
          action: 'remove',
        });
      }
    }
  }

  const patchFile = generateCssPatch(changes);

  return {
    direction: 'to-code' as SyncDirection,
    changes,
    patchFile: patchFile || undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Apply sync changes to actual CSS files in the project.
 */
export function applySyncChanges(
  changes: SyncChange[],
  cssFiles: Map<string, string>,
): { modifiedFiles: Map<string, string>; appliedCount: number } {
  const modifiedFiles = new Map<string, string>();
  let appliedCount = 0;

  const updateChanges = changes.filter(c => c.action === 'update');

  for (const [filename, content] of cssFiles) {
    let modified = content;
    let fileChanged = false;

    for (const change of updateChanges) {
      // Try CSS custom property replacement
      const propName = change.property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedFrom = change.fromValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cssRegex = new RegExp(
        `(${propName}\\s*:\\s*)${escapedFrom}(\\s*[;\\n])`,
        'g',
      );

      let newContent = modified.replace(cssRegex, `$1${change.toValue}$2`);

      // Also try Tailwind config format in <script> tags:
      // "primary": "#256af4" → "primary": "#8b5cf6"
      if (newContent === modified) {
        const twResult = applySyncToHtml(modified, change);
        if (twResult !== modified) {
          newContent = twResult;
        }
      }

      if (newContent !== modified) {
        modified = newContent;
        fileChanged = true;
        appliedCount++;
      }
    }

    if (fileChanged) {
      modifiedFiles.set(filename, modified);
    }
  }

  return { modifiedFiles, appliedCount };
}

/**
 * Apply a sync change to HTML content by editing Tailwind config <script> values.
 * Handles format: "primary": "#256af4" → "primary": "#8b5cf6"
 */
function applySyncToHtml(html: string, change: SyncChange): string {
  // Extract the token name from --tw-primary → primary
  const tokenName = change.property
    .replace(/^--tw-/, '')
    .replace(/^--/, '');

  const escapedFrom = change.fromValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Match: "primary": "#256af4"  or  "primary": "Inter"
  const regex = new RegExp(
    `("${tokenName}"\\s*:\\s*)["']${escapedFrom}["']`,
    'g',
  );

  return html.replace(regex, `$1"${change.toValue}"`);
}

/**
 * Generate CSS variable patch content from sync changes.
 */
function generateCssPatch(changes: SyncChange[]): string {
  if (changes.length === 0) return '';

  const lines: string[] = [
    '/* drift-guard sync patch — apply these changes to your CSS */',
    '/* Generated by: drift-guard sync --direction to-code */',
    '',
    ':root {',
  ];

  for (const change of changes) {
    if (change.action === 'remove') {
      lines.push(`  /* REMOVED: ${change.property}: ${change.fromValue}; */`);
    } else {
      const comment =
        change.action === 'update'
          ? ` /* was: ${change.fromValue} */`
          : ' /* NEW */';
      lines.push(`  ${change.property}: ${change.toValue};${comment}`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}
