// drift-guard — Protect your UI from AI coding agents' design drift
// Public API

export { createSnapshot, saveSnapshot, loadSnapshot, scanProject } from './core/snapshot.js';
export { detectDrift } from './core/drift.js';
export { generateRules, saveRules } from './core/rules-generator.js';
export type {
  DesignToken,
  DesignSnapshot,
  DriftReport,
  DriftItem,
  DriftGuardConfig,
  TokenCategory,
  RuleFormat,
} from './types/index.js';
export { DEFAULT_CONFIG } from './types/index.js';
