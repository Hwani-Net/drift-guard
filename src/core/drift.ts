import type {
  DesignSnapshot,
  DesignToken,
  DriftItem,
  DriftReport,
  TokenCategory,
} from '../types/index.js';
import { scanProject, loadConfig } from './snapshot.js';

/**
 * Compare two tokens by their key (file + selector + property)
 */
function tokenKey(token: DesignToken): string {
  return `${token.file}::${token.selector}::${token.property}`;
}

/**
 * Detect design drift between a snapshot and the current project state
 */
export async function detectDrift(
  projectRoot: string,
  snapshot: DesignSnapshot,
  threshold: number = 10,
): Promise<DriftReport> {
  const config = loadConfig(projectRoot);
  const { tokens: currentTokens } = await scanProject(projectRoot, config);

  // Build lookup maps
  const snapshotMap = new Map<string, DesignToken>();
  for (const token of snapshot.tokens) {
    snapshotMap.set(tokenKey(token), token);
  }

  const currentMap = new Map<string, DesignToken>();
  for (const token of currentTokens) {
    currentMap.set(tokenKey(token), token);
  }

  const driftItems: DriftItem[] = [];

  // Check for modified and deleted tokens
  for (const [key, original] of snapshotMap) {
    const current = currentMap.get(key);

    if (!current) {
      // Token was deleted
      driftItems.push({
        original,
        current: null,
        changeType: 'deleted',
      });
    } else if (current.value !== original.value) {
      // Token was modified
      driftItems.push({
        original,
        current,
        changeType: 'modified',
      });
    }
  }

  // Check for added tokens (in current but not in snapshot)
  // Note: Added tokens are tracked but don't count as "drift" by default
  // because adding new styles is expected behavior during feature development

  const totalTokens = snapshot.tokens.length;
  const changedTokens = driftItems.length;
  const driftScore = totalTokens > 0
    ? Math.round((changedTokens / totalTokens) * 100 * 100) / 100
    : 0;

  // Build category summary
  const categorySummary: DriftReport['categorySummary'] = {} as DriftReport['categorySummary'];
  const categories: TokenCategory[] = ['color', 'font', 'spacing', 'shadow', 'radius', 'layout', 'other'];

  for (const cat of categories) {
    const total = snapshot.tokens.filter(t => t.category === cat).length;
    const changed = driftItems.filter(d => d.original.category === cat).length;
    categorySummary[cat] = {
      total,
      changed,
      driftPercent: total > 0 ? Math.round((changed / total) * 100 * 100) / 100 : 0,
    };
  }

  return {
    checkedAt: new Date().toISOString(),
    snapshotCreatedAt: snapshot.createdAt,
    totalTokens,
    changedTokens,
    driftScore,
    threshold,
    passed: driftScore <= threshold,
    items: driftItems,
    categorySummary,
  };
}
