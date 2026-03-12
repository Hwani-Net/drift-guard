import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { createSnapshot, saveSnapshot, saveConfig } from '../core/snapshot.js';
import { generateRules, saveRules } from '../core/rules-generator.js';
import { DEFAULT_CONFIG } from '../types/index.js';

interface InitOptions {
  from?: string;
  threshold?: string;
  skipRules?: boolean;
  skipHook?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const projectRoot = process.cwd();
  const threshold = parseInt(options.threshold ?? '10', 10);

  console.log(chalk.bold('\n🛡️  drift-guard init\n'));
  console.log(chalk.dim('Scanning project for design tokens...\n'));

  // Save config
  const config = { ...DEFAULT_CONFIG, threshold };
  saveConfig(projectRoot, config);

  // Create snapshot
  const snapshot = await createSnapshot(projectRoot, options.from);

  if (snapshot.tokens.length === 0) {
    console.log(chalk.yellow('⚠️  No design tokens found.'));
    console.log(chalk.dim('  Make sure you have CSS files or use --from <stitch.html>'));
    console.log(chalk.dim('  Supported patterns: src/**/*.css, app/**/*.css, styles/**/*.css\n'));
    return;
  }

  // Save snapshot
  const snapshotPath = saveSnapshot(projectRoot, snapshot);

  // Report
  console.log(chalk.green('✅ Design snapshot created!\n'));
  console.log(chalk.dim('  Snapshot: ') + chalk.white(snapshotPath));
  console.log(chalk.dim('  Files scanned: ') + chalk.white(snapshot.sourceFiles.length.toString()));
  console.log(chalk.dim('  Tokens locked: ') + chalk.white(snapshot.tokens.length.toString()));
  console.log(chalk.dim('  Threshold: ') + chalk.white(`${threshold}%`));
  console.log();

  // Token summary
  console.log(chalk.bold('  Token Summary:'));
  const categories = ['color', 'font', 'spacing', 'shadow', 'radius', 'layout'] as const;
  for (const cat of categories) {
    const count = snapshot.summary[cat];
    if (count > 0) {
      const icon = { color: '🎨', font: '📝', spacing: '📏', shadow: '🌫️', radius: '⭕', layout: '📐' }[cat];
      console.log(chalk.dim(`  ${icon} ${cat}: `) + chalk.white(count.toString()));
    }
  }

  // Structure fingerprint summary (v0.2.0+)
  if (snapshot.structure) {
    const s = snapshot.structure;
    const tagList = Object.entries(s.semanticTags)
      .filter(([, count]) => count > 0)
      .map(([tag, count]) => `${tag}(${count})`)
      .join(', ');
    console.log();
    console.log(chalk.bold('  Structure Fingerprint:'));
    console.log(chalk.dim('  🏗️  semantic tags: ') + chalk.white(tagList));
    console.log(chalk.dim('  🏗️  max depth: ') + chalk.white(s.maxDepth.toString()));
    console.log(chalk.dim('  🏗️  layout hash: ') + chalk.white(s.layoutHash));
  }

  console.log();

  // ─── Auto-generate AI agent rules (AGENTS.md) ───────────────
  if (!options.skipRules) {
    try {
      const content = generateRules(snapshot, 'agents-md');
      const rulesPath = saveRules(projectRoot, 'agents-md', content, false);
      console.log(chalk.green('✅ AI agent rules generated: ') + chalk.white(rulesPath));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not generate rules: ') + chalk.dim((error as Error).message));
    }
  } else {
    console.log(chalk.dim('  ⏭  Skipped rules generation (--skip-rules)'));
  }

  // ─── Auto-install git pre-commit hook ───────────────────────
  if (!options.skipHook) {
    const hasGit = fs.existsSync(path.join(projectRoot, '.git'));
    if (hasGit) {
      try {
        installHookSilent(projectRoot, threshold.toString());
        console.log(chalk.green('✅ Pre-commit hook installed: ') + chalk.dim('drift-guard check runs before every commit'));
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not install hook: ') + chalk.dim((error as Error).message));
      }
    } else {
      console.log(chalk.dim('  ⏭  No .git directory found — skipping hook install'));
    }
  } else {
    console.log(chalk.dim('  ⏭  Skipped hook installation (--skip-hook)'));
  }

  console.log();
  console.log(chalk.green.bold('  🛡️  Protection active!'));
  console.log(chalk.dim('  Run ') + chalk.cyan('npx drift-guard check') + chalk.dim(' anytime to verify design integrity.'));
  if (!options.skipRules) {
    console.log(chalk.dim('  Run ') + chalk.cyan('npx drift-guard rules --format all') + chalk.dim(' for additional AI tool formats.'));
  }
  console.log();
}

/**
 * Install pre-commit hook without verbose output (used by init auto-setup)
 */
function installHookSilent(projectRoot: string, threshold: string): void {
  const hasHusky = fs.existsSync(path.join(projectRoot, '.husky'));
  const hookCommand = `npx drift-guard check --threshold ${threshold} --ci`;

  if (hasHusky) {
    const hookFile = path.join(projectRoot, '.husky', 'pre-commit');
    if (fs.existsSync(hookFile)) {
      const existing = fs.readFileSync(hookFile, 'utf-8');
      if (existing.includes('drift-guard')) return; // already installed
      fs.appendFileSync(hookFile, `\n${hookCommand}\n`);
    } else {
      fs.writeFileSync(hookFile, `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\n${hookCommand}\n`);
    }
    return;
  }

  // Direct .git/hooks installation
  const hooksDir = path.join(projectRoot, '.git', 'hooks');
  const hookFile = path.join(hooksDir, 'pre-commit');
  const hookScript = `#!/usr/bin/env sh
# drift-guard pre-commit hook
# Checks for design token drift before commits
# Bypass: git commit --no-verify

npx drift-guard check --threshold ${threshold} --ci

if [ $? -ne 0 ]; then
  echo ""
  echo "\\033[31m✗ Design drift detected! Commit blocked.\\033[0m"
  echo "  Run 'npx drift-guard check' for details."
  echo "  If changes are intentional, run 'npx drift-guard snapshot update'"
  echo "  Or use 'git commit --no-verify' to bypass."
  exit 1
fi
`;

  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  if (fs.existsSync(hookFile)) {
    const existing = fs.readFileSync(hookFile, 'utf-8');
    if (existing.includes('drift-guard')) return; // already installed
    fs.appendFileSync(hookFile, `\n${hookScript}`);
  } else {
    fs.writeFileSync(hookFile, hookScript);
    try {
      fs.chmodSync(hookFile, 0o755);
    } catch {
      // Windows may not support chmod
    }
  }
}
