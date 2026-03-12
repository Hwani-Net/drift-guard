import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { parseCss, extractCssVariables } from '../parsers/css-parser.js';
import { parseHtml, extractStyleBlocks, extractTailwindConfig } from '../parsers/html-parser.js';
import { computeStructureFingerprint } from '../parsers/structure-parser.js';
import type {
  DesignSnapshot,
  DesignToken,
  TokenCategory,
  DriftGuardConfig,
  StructureFingerprint,
} from '../types/index.js';
import { DEFAULT_CONFIG } from '../types/index.js';

const SNAPSHOT_DIR = '.design-guard';
const SNAPSHOT_FILE = 'snapshot.json';
const CONFIG_FILE = 'config.json';

/**
 * Get the full path to the snapshot file
 */
export function getSnapshotPath(projectRoot: string): string {
  return path.join(projectRoot, SNAPSHOT_DIR, SNAPSHOT_FILE);
}

/**
 * Get the config path
 */
export function getConfigPath(projectRoot: string): string {
  return path.join(projectRoot, SNAPSHOT_DIR, CONFIG_FILE);
}

/**
 * Load or create config
 */
export function loadConfig(projectRoot: string): DriftGuardConfig {
  const configPath = getConfigPath(projectRoot);
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Save config
 */
export function saveConfig(projectRoot: string, config: DriftGuardConfig): void {
  const dir = path.join(projectRoot, SNAPSHOT_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getConfigPath(projectRoot), JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Scan the project and extract all design tokens
 */
export async function scanProject(
  projectRoot: string,
  config: DriftGuardConfig,
  stitchHtmlPath?: string,
): Promise<{ tokens: DesignToken[]; files: string[] }> {
  const allTokens: DesignToken[] = [];
  const scannedFiles: string[] = [];

  // 1. If a Stitch HTML file is provided, parse it first
  if (stitchHtmlPath) {
    const absPath = path.resolve(projectRoot, stitchHtmlPath);
    if (fs.existsSync(absPath)) {
      const htmlContent = fs.readFileSync(absPath, 'utf-8');
      const htmlTokens = parseHtml(htmlContent, stitchHtmlPath);
      allTokens.push(...htmlTokens);

      // Also parse <style> blocks within the HTML
      const styleBlocks = extractStyleBlocks(htmlContent);
      for (const block of styleBlocks) {
        const cssTokens = parseCss(block, stitchHtmlPath);
        allTokens.push(...cssTokens);
        const vars = extractCssVariables(block, stitchHtmlPath);
        allTokens.push(...vars);
      }
      scannedFiles.push(stitchHtmlPath);

      // Also extract Tailwind config from <script> tags
      const twTokens = extractTailwindConfig(htmlContent, stitchHtmlPath);
      allTokens.push(...twTokens);
    }
  }

  // 2. Scan CSS files
  const cssFiles = await fg(config.cssFiles, {
    cwd: projectRoot,
    ignore: config.ignore,
    absolute: false,
  });

  for (const file of cssFiles) {
    const absPath = path.join(projectRoot, file);
    const content = fs.readFileSync(absPath, 'utf-8');
    const tokens = parseCss(content, file);
    allTokens.push(...tokens);
    const vars = extractCssVariables(content, file);
    allTokens.push(...vars);
    scannedFiles.push(file);
  }

  // 3. Scan HTML files (for inline styles)
  const htmlFiles = await fg(config.htmlFiles, {
    cwd: projectRoot,
    ignore: config.ignore,
    absolute: false,
  });

  for (const file of htmlFiles) {
    if (scannedFiles.includes(file)) continue; // Skip if already scanned (e.g., Stitch HTML)
    const absPath = path.join(projectRoot, file);
    const content = fs.readFileSync(absPath, 'utf-8');
    const tokens = parseHtml(content, file);
    allTokens.push(...tokens);

    // Parse embedded <style> blocks
    const styleBlocks = extractStyleBlocks(content);
    for (const block of styleBlocks) {
      const cssTokens = parseCss(block, file);
      allTokens.push(...cssTokens);
    }

    // Extract Tailwind config from <script> tags
    const twTokens = extractTailwindConfig(content, file);
    allTokens.push(...twTokens);

    scannedFiles.push(file);
  }

  // Filter by tracked categories
  const filtered = allTokens.filter(t =>
    config.trackCategories.includes(t.category),
  );

  // Deduplicate: same property + selector + file = keep first
  const seen = new Set<string>();
  const deduplicated = filtered.filter(t => {
    const key = `${t.file}:${t.selector}:${t.property}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { tokens: deduplicated, files: scannedFiles };
}

/**
 * Build category summary from tokens
 */
function buildSummary(tokens: DesignToken[]): Record<TokenCategory, number> {
  const summary: Record<TokenCategory, number> = {
    color: 0,
    font: 0,
    spacing: 0,
    shadow: 0,
    radius: 0,
    layout: 0,
    other: 0,
  };

  for (const token of tokens) {
    summary[token.category]++;
  }

  return summary;
}

/**
 * Create a snapshot from the current project state
 */
export async function createSnapshot(
  projectRoot: string,
  stitchHtmlPath?: string,
): Promise<DesignSnapshot> {
  const config = loadConfig(projectRoot);
  const { tokens, files } = await scanProject(projectRoot, config, stitchHtmlPath);

  // Compute structure fingerprint from HTML files
  let structure: StructureFingerprint | undefined;
  let structureSourceFile: string | undefined;
  try {
    // Use Stitch HTML if provided, otherwise try to find an HTML file
    let htmlForStructure: string | null = null;

    if (stitchHtmlPath) {
      const absPath = path.resolve(projectRoot, stitchHtmlPath);
      if (fs.existsSync(absPath)) {
        htmlForStructure = fs.readFileSync(absPath, 'utf-8');
        structureSourceFile = stitchHtmlPath;
      }
    } else {
      // Try to find any HTML file in the scanned files
      for (const file of files) {
        if (file.endsWith('.html')) {
          const absPath = path.join(projectRoot, file);
          if (fs.existsSync(absPath)) {
            htmlForStructure = fs.readFileSync(absPath, 'utf-8');
            structureSourceFile = file;
            break;
          }
        }
      }
    }

    if (htmlForStructure) {
      structure = computeStructureFingerprint(htmlForStructure);
    }
  } catch {
    // Structure fingerprint is optional — don't fail the snapshot
  }

  const snapshot: DesignSnapshot = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    projectRoot,
    sourceFiles: files,
    tokens,
    summary: buildSummary(tokens),
    structure,
    structureSourceFile,
  };

  return snapshot;
}

/**
 * Save a snapshot to disk
 */
export function saveSnapshot(projectRoot: string, snapshot: DesignSnapshot): string {
  const dir = path.join(projectRoot, SNAPSHOT_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const snapshotPath = getSnapshotPath(projectRoot);
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return snapshotPath;
}

/**
 * Load an existing snapshot from disk
 */
export function loadSnapshot(projectRoot: string): DesignSnapshot | null {
  const snapshotPath = getSnapshotPath(projectRoot);
  if (!fs.existsSync(snapshotPath)) {
    return null;
  }

  const raw = fs.readFileSync(snapshotPath, 'utf-8');
  return JSON.parse(raw) as DesignSnapshot;
}
