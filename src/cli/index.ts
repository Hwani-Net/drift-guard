#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './init.js';
import { checkCommand } from './check.js';
import { rulesCommand } from './rules.js';
import { snapshotCommand } from './snapshot-cmd.js';
import { hookInstallCommand, hookUninstallCommand } from './hook.js';
import { syncCommand } from './sync.js';

// Version injected at build time by tsup define
declare const DRIFT_GUARD_VERSION: string;

const program = new Command();

program
  .name('drift-guard')
  .description(
    chalk.bold('🛡️  drift-guard') +
    ' — Protect your UI from AI coding agents\' design drift.\n\n' +
    '  Detect and prevent design token changes during AI-assisted development.\n' +
    '  Lock your colors, fonts, spacing, and layout before AI agents touch your code.'
  )
  .version(DRIFT_GUARD_VERSION);

program
  .command('init')
  .description('Initialize drift-guard: snapshot + AI rules + git hook (all-in-one)')
  .option('--from <path>', 'Create snapshot from a Stitch/HTML file')
  .option('--threshold <number>', 'Set default drift threshold percentage', '10')
  .option('--skip-rules', 'Skip auto-generating AGENTS.md rules file')
  .option('--skip-hook', 'Skip auto-installing pre-commit git hook')
  .action(initCommand);

program
  .command('check')
  .description('Check for design drift against the saved snapshot')
  .option('--threshold <number>', 'Override drift threshold percentage')
  .option('--output <format>', 'Output format: text or json', 'text')
  .option('--ci', 'CI mode: exit with code 1 on drift exceeding threshold')
  .action(checkCommand);

program
  .command('rules')
  .description('Generate AI agent rule files from the design snapshot')
  .option('--format <type>', 'Rule format: cursorrules, claude-md, agents-md, copilot, clinerules, all', 'all')
  .option('--append', 'Append to existing rule files instead of overwriting')
  .action(rulesCommand);

program
  .command('snapshot')
  .description('Manage design snapshots')
  .command('update')
  .description('Update the snapshot to reflect current design (after intentional changes)')
  .option('--from <path>', 'Update from a specific Stitch/HTML file')
  .action(snapshotCommand);

const hook = program
  .command('hook')
  .description('Manage pre-commit hook for automatic drift checking');

hook
  .command('install')
  .description('Install a pre-commit hook that runs drift-guard check')
  .option('--threshold <number>', 'Drift threshold percentage for the hook', '10')
  .action(hookInstallCommand);

hook
  .command('uninstall')
  .description('Remove the drift-guard pre-commit hook')
  .action(hookUninstallCommand);

program.addCommand(syncCommand);

program.parse();

