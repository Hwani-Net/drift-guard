import chalk from 'chalk';
import { loadSnapshot } from '../core/snapshot.js';
import { generateRules, saveRules } from '../core/rules-generator.js';
import type { RuleFormat } from '../types/index.js';

interface RulesOptions {
  format?: string;
  append?: boolean;
}

const ALL_FORMATS: RuleFormat[] = ['cursorrules', 'claude-md', 'agents-md', 'copilot', 'clinerules'];

export async function rulesCommand(options: RulesOptions): Promise<void> {
  const projectRoot = process.cwd();

  const snapshot = loadSnapshot(projectRoot);
  if (!snapshot) {
    console.log(chalk.red('\n❌ No snapshot found.'));
    console.log(chalk.dim('  Run ') + chalk.cyan('npx drift-guard init') + chalk.dim(' first.\n'));
    process.exit(1);
  }

  const formats: RuleFormat[] = options.format === 'all' || !options.format
    ? ALL_FORMATS
    : [options.format as RuleFormat];

  console.log(chalk.bold('\n🛡️  drift-guard rules\n'));
  console.log(chalk.dim(`Generating AI protection rules from ${snapshot.tokens.length} locked tokens...\n`));

  for (const format of formats) {
    try {
      const content = generateRules(snapshot, format);
      const filePath = saveRules(projectRoot, format, content, options.append ?? false);
      console.log(chalk.green('  ✅ ') + chalk.white(filePath));
    } catch (error) {
      console.log(chalk.red('  ❌ ') + chalk.white(format) + chalk.dim(`: ${(error as Error).message}`));
    }
  }

  console.log();
  console.log(chalk.dim('Your AI coding agents will now protect these design tokens.'));
  console.log(chalk.dim('Supported tools: Cursor, Claude Code, Codex, GitHub Copilot, Cline\n'));
}
