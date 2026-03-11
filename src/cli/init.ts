import chalk from 'chalk';
import { createSnapshot, saveSnapshot, saveConfig } from '../core/snapshot.js';
import { DEFAULT_CONFIG } from '../types/index.js';

interface InitOptions {
  from?: string;
  threshold?: string;
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

  console.log();
  console.log(chalk.dim('Next steps:'));
  console.log(chalk.cyan('  1. ') + 'Add .design-guard/ to .gitignore (optional)');
  console.log(chalk.cyan('  2. ') + chalk.bold('npx drift-guard rules') + ' — Generate AI agent protection rules');
  console.log(chalk.cyan('  3. ') + chalk.bold('npx drift-guard check') + ' — Check for design drift anytime');
  console.log();
}
