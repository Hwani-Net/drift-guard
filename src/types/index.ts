// drift-guard type definitions

/**
 * A single design token extracted from CSS/HTML
 */
export interface DesignToken {
  /** Token category: color, font, spacing, shadow, radius, layout */
  category: TokenCategory;
  /** CSS property name (e.g., 'color', 'font-family', 'padding') */
  property: string;
  /** Resolved value (e.g., '#1a73e8', '16px', 'Inter') */
  value: string;
  /** CSS selector where this token was found */
  selector: string;
  /** Source file path */
  file: string;
  /** Line number in source file */
  line?: number;
}

export type TokenCategory =
  | 'color'
  | 'font'
  | 'spacing'
  | 'shadow'
  | 'radius'
  | 'layout'
  | 'other';

/**
 * Design snapshot — frozen state of all design tokens
 */
export interface DesignSnapshot {
  /** Snapshot version */
  version: string;
  /** ISO timestamp when snapshot was created */
  createdAt: string;
  /** Project root directory */
  projectRoot: string;
  /** Source files that were scanned */
  sourceFiles: string[];
  /** All extracted design tokens */
  tokens: DesignToken[];
  /** Token count by category */
  summary: Record<TokenCategory, number>;
}

/**
 * A single drift item — one token that changed
 */
export interface DriftItem {
  /** The original token from the snapshot */
  original: DesignToken;
  /** The current token value (null if token was deleted) */
  current: DesignToken | null;
  /** Type of change */
  changeType: 'modified' | 'deleted' | 'added';
}

/**
 * Drift detection report
 */
export interface DriftReport {
  /** ISO timestamp of the check */
  checkedAt: string;
  /** Snapshot used as baseline */
  snapshotCreatedAt: string;
  /** Total tokens in snapshot */
  totalTokens: number;
  /** Number of changed tokens */
  changedTokens: number;
  /** Drift score: (changed / total) * 100 */
  driftScore: number;
  /** Threshold used for pass/fail */
  threshold: number;
  /** Whether the check passed */
  passed: boolean;
  /** Individual drift items */
  items: DriftItem[];
  /** Summary by category */
  categorySummary: Record<TokenCategory, {
    total: number;
    changed: number;
    driftPercent: number;
  }>;
}

/**
 * Supported AI rule file formats
 */
export type RuleFormat =
  | 'cursorrules'
  | 'claude-md'
  | 'agents-md'
  | 'copilot'
  | 'clinerules';

/**
 * Configuration stored in .design-guard/config.json
 */
export interface DriftGuardConfig {
  /** Glob patterns for CSS files to scan */
  cssFiles: string[];
  /** Glob patterns for HTML files to scan */
  htmlFiles: string[];
  /** Default drift threshold (percentage) */
  threshold: number;
  /** Token categories to track */
  trackCategories: TokenCategory[];
  /** Files/patterns to ignore */
  ignore: string[];
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: DriftGuardConfig = {
  cssFiles: [
    'src/**/*.css',
    'app/**/*.css',
    'styles/**/*.css',
    '**/*.module.css',
    '**/*.css',
  ],
  htmlFiles: [
    '**/*.html',
    '!node_modules/**',
    '!dist/**',
    '!build/**',
  ],
  threshold: 10,
  trackCategories: ['color', 'font', 'spacing', 'shadow', 'radius', 'layout'],
  ignore: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.next/**',
    'coverage/**',
  ],
};
