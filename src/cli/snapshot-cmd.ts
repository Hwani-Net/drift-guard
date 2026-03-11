import chalk from 'chalk';
import { createSnapshot, saveSnapshot } from '../core/snapshot.js';

interface SnapshotOptions {
  from?: string;
}

export async function snapshotCommand(options: SnapshotOptions): Promise<void> {
  const projectRoot = process.cwd();

  console.log(chalk.bold('\n🛡️  drift-guard snapshot update\n'));
  console.log(chalk.dim('Re-scanning project and updating snapshot...\n'));

  const snapshot = await createSnapshot(projectRoot, options.from);

  if (snapshot.tokens.length === 0) {
    console.log(chalk.yellow('⚠️  No design tokens found.\n'));
    return;
  }

  const snapshotPath = saveSnapshot(projectRoot, snapshot);

  console.log(chalk.green('✅ Snapshot updated!\n'));
  console.log(chalk.dim('  File: ') + chalk.white(snapshotPath));
  console.log(chalk.dim('  Tokens: ') + chalk.white(snapshot.tokens.length.toString()));
  console.log(chalk.dim('  Updated: ') + chalk.white(snapshot.createdAt));
  console.log();
  console.log(chalk.dim('💡 Remember to regenerate rules: ') + chalk.cyan('npx drift-guard rules\n'));
}
