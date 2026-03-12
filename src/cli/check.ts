import chalk from 'chalk';
import { loadSnapshot, loadConfig } from '../core/snapshot.js';
import { detectDrift } from '../core/drift.js';
import type { DriftReport, DriftItem } from '../types/index.js';

interface CheckOptions {
  threshold?: string;
  output?: string;
  ci?: boolean;
}

export async function checkCommand(options: CheckOptions): Promise<void> {
  const projectRoot = process.cwd();

  // Load snapshot
  const snapshot = loadSnapshot(projectRoot);
  if (!snapshot) {
    console.log(chalk.red('\n❌ No snapshot found.'));
    console.log(chalk.dim('  Run ') + chalk.cyan('npx drift-guard init') + chalk.dim(' first.\n'));
    process.exit(1);
  }

  const config = loadConfig(projectRoot);
  const threshold = options.threshold
    ? parseInt(options.threshold, 10)
    : config.threshold;

  console.log(chalk.bold('\n🛡️  drift-guard check\n'));

  // Snapshot age warning
  const snapshotAge = Date.now() - new Date(snapshot.createdAt).getTime();
  const ageDays = Math.floor(snapshotAge / (1000 * 60 * 60 * 24));
  if (ageDays >= 7) {
    const ageStr = ageDays >= 30 ? `${Math.floor(ageDays / 30)} month(s)` : `${ageDays} days`;
    console.log(chalk.yellow(`⚠️  Snapshot is ${ageStr} old (created ${snapshot.createdAt.split('T')[0]}).`));
    console.log(chalk.yellow('   If your design has changed, run: ') + chalk.cyan('drift-guard init --from <latest.html>\n'));
  }

  console.log(chalk.dim(`Comparing against snapshot from ${snapshot.createdAt}...\n`));

  // Detect drift
  const report = await detectDrift(projectRoot, snapshot, threshold);

  if (options.output === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report);
  }

  // Exit code for CI
  if (!report.passed && (options.ci || process.env['CI'])) {
    process.exit(1);
  }

  if (!report.passed) {
    process.exitCode = 1;
  }
}

function printTextReport(report: DriftReport): void {
  // Score display
  const scoreColor = report.passed ? chalk.green : chalk.red;
  const icon = report.passed ? '✅' : '🚨';

  console.log(`${icon} ${chalk.bold('Drift Score:')} ${scoreColor(`${report.driftScore}%`)} (threshold: ${report.threshold}%)`);
  console.log(chalk.dim(`   ${report.changedTokens} of ${report.totalTokens} tokens changed\n`));

  if (report.items.length === 0 && !(report.structureDrift?.changed)) {
    console.log(chalk.green('   No design drift detected. Your design is intact! 🎉\n'));
    return;
  }

  if (report.items.length > 0) {
    // Category breakdown
    console.log(chalk.bold('   Category Breakdown:'));
    const categories = ['color', 'font', 'spacing', 'shadow', 'radius', 'layout'] as const;
    for (const cat of categories) {
      const summary = report.categorySummary[cat];
      if (summary.total === 0) continue;

      const catIcon = { color: '🎨', font: '📝', spacing: '📏', shadow: '🌫️', radius: '⭕', layout: '📐' }[cat];
      const catColor = summary.changed > 0 ? chalk.red : chalk.green;
      console.log(`   ${catIcon} ${cat}: ${catColor(`${summary.changed}/${summary.total}`)} (${summary.driftPercent}%)`);
    }
    console.log();

    // Detailed changes (max 20)
    const itemsToShow = report.items.slice(0, 20);
    if (itemsToShow.length > 0) {
      console.log(chalk.bold('   Changes:'));
      for (const item of itemsToShow) {
        printDriftItem(item);
      }

      if (report.items.length > 20) {
        console.log(chalk.dim(`   ... and ${report.items.length - 20} more changes\n`));
      }
    }

    console.log();
  }

  // Structure drift (v0.2.0+)
  if (report.structureDrift) {
    if (report.structureDrift.changed) {
      console.log(chalk.bold('   🏗️  Structure Drift:'));
      for (const detail of report.structureDrift.details) {
        console.log(chalk.yellow(`      ⚠️  ${detail}`));
      }
      console.log();
    } else {
      console.log(chalk.green('   🏗️  DOM structure: No changes detected ✅\n'));
    }
  }

  if (!report.passed) {
    console.log(chalk.yellow('   💡 To accept these changes, run:'));
    console.log(chalk.cyan('      npx drift-guard snapshot update\n'));
  }
}

function printDriftItem(item: DriftItem): void {
  const { original, current, changeType } = item;

  switch (changeType) {
    case 'modified':
      console.log(
        chalk.yellow('   ~') +
        chalk.dim(` ${original.file} `) +
        chalk.white(`${original.property}: `) +
        chalk.red(original.value) +
        chalk.dim(' → ') +
        chalk.green(current?.value ?? 'removed')
      );
      break;
    case 'deleted':
      console.log(
        chalk.red('   -') +
        chalk.dim(` ${original.file} `) +
        chalk.white(`${original.property}: `) +
        chalk.red(original.value) +
        chalk.dim(' [deleted]')
      );
      break;
    case 'added':
      console.log(
        chalk.green('   +') +
        chalk.dim(` ${original.file} `) +
        chalk.white(`${original.property}: `) +
        chalk.green(original.value)
      );
      break;
  }
}
