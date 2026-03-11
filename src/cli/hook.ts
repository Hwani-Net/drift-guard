import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import chalk from 'chalk';

/**
 * Install a pre-commit hook that runs drift-guard check
 */
export async function hookInstallCommand(options: { threshold?: string }): Promise<void> {
  const cwd = process.cwd();
  const threshold = options.threshold ?? '10';

  // Check if git repo
  if (!fs.existsSync(path.join(cwd, '.git'))) {
    console.error(chalk.red('✗ Not a git repository. Run this from a git project root.'));
    process.exit(1);
  }

  // Detect hook manager
  const hasHusky = fs.existsSync(path.join(cwd, '.husky'));
  const hasLefthook = fs.existsSync(path.join(cwd, 'lefthook.yml')) ||
    fs.existsSync(path.join(cwd, '.lefthook.yml'));

  if (hasHusky) {
    // Add to existing husky setup
    const hookFile = path.join(cwd, '.husky', 'pre-commit');
    const hookCommand = `npx drift-guard check --threshold ${threshold} --ci`;

    if (fs.existsSync(hookFile)) {
      const existing = fs.readFileSync(hookFile, 'utf-8');
      if (existing.includes('drift-guard')) {
        console.log(chalk.yellow('⚠ drift-guard hook already exists in .husky/pre-commit'));
        return;
      }
      fs.appendFileSync(hookFile, `\n${hookCommand}\n`);
    } else {
      fs.writeFileSync(hookFile, `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\n${hookCommand}\n`);
    }

    console.log(chalk.green('✓ Added drift-guard check to .husky/pre-commit'));
    return;
  }

  if (hasLefthook) {
    console.log(chalk.yellow('⚠ lefthook detected. Add this to your lefthook.yml:'));
    console.log(chalk.cyan(`
pre-commit:
  commands:
    drift-guard:
      run: npx drift-guard check --threshold ${threshold} --ci
`));
    return;
  }

  // No hook manager — install via .git/hooks directly
  const hooksDir = path.join(cwd, '.git', 'hooks');
  const hookFile = path.join(hooksDir, 'pre-commit');
  const hookScript = `#!/usr/bin/env sh
# drift-guard pre-commit hook
# Checks for design token drift before commits
# Use --force flag to bypass: git commit --no-verify

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
    if (existing.includes('drift-guard')) {
      console.log(chalk.yellow('⚠ drift-guard hook already installed'));
      return;
    }
    // Append to existing hook
    fs.appendFileSync(hookFile, `\n${hookScript}`);
    console.log(chalk.green('✓ Appended drift-guard to existing pre-commit hook'));
  } else {
    fs.writeFileSync(hookFile, hookScript);
    // Make executable on Unix
    try {
      fs.chmodSync(hookFile, 0o755);
    } catch {
      // Windows may not support chmod, skip
    }
    console.log(chalk.green('✓ Installed drift-guard pre-commit hook'));
  }

  console.log(chalk.dim(`  Threshold: ${threshold}%`));
  console.log(chalk.dim('  Bypass: git commit --no-verify'));
}

/**
 * Uninstall the pre-commit hook
 */
export async function hookUninstallCommand(): Promise<void> {
  const cwd = process.cwd();

  // Check husky
  const huskyHook = path.join(cwd, '.husky', 'pre-commit');
  if (fs.existsSync(huskyHook)) {
    const content = fs.readFileSync(huskyHook, 'utf-8');
    if (content.includes('drift-guard')) {
      const cleaned = content.replace(/\n?npx drift-guard.*\n?/g, '\n');
      fs.writeFileSync(huskyHook, cleaned);
      console.log(chalk.green('✓ Removed drift-guard from .husky/pre-commit'));
      return;
    }
  }

  // Check .git/hooks
  const gitHook = path.join(cwd, '.git', 'hooks', 'pre-commit');
  if (fs.existsSync(gitHook)) {
    const content = fs.readFileSync(gitHook, 'utf-8');
    if (content.includes('drift-guard')) {
      // If the entire file is our hook, remove it
      if (content.includes('# drift-guard pre-commit hook') && !content.includes('\n#!/usr/bin/env sh\n')) {
        fs.unlinkSync(gitHook);
        console.log(chalk.green('✓ Removed drift-guard pre-commit hook'));
      } else {
        // Remove just our part
        const cleaned = content.replace(/# drift-guard pre-commit hook[\s\S]*?fi\n?/g, '');
        fs.writeFileSync(gitHook, cleaned);
        console.log(chalk.green('✓ Removed drift-guard from pre-commit hook'));
      }
      return;
    }
  }

  console.log(chalk.yellow('⚠ No drift-guard hook found to uninstall'));
}
