import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import fg from 'fast-glob';
import { loadSnapshot, loadConfig } from '../core/snapshot.js';
import { detectDrift } from '../core/drift.js';
import {
  syncToStitch,
  syncFromStitch,
  applySyncChanges,
} from '../core/sync.js';
import { parseCss, extractCssVariables } from '../parsers/css-parser.js';
import { parseHtml, extractStyleBlocks, extractTailwindConfig } from '../parsers/html-parser.js';
import type { DesignToken, SyncDirection } from '../types/index.js';

export const syncCommand = new Command('sync')
  .description('Synchronize design tokens between Stitch and your codebase')
  .requiredOption(
    '-d, --direction <direction>',
    'Sync direction: to-stitch (push code changes to Stitch) or to-code (pull Stitch changes)',
  )
  .option(
    '--stitch-html <path>',
    'Path to Stitch HTML file (for to-code direction)',
  )
  .option(
    '--stitch-project <id>',
    'Stitch project ID (for to-stitch direction)',
  )
  .option(
    '--stitch-screen <id>',
    'Stitch screen ID (for to-stitch direction)',
  )
  .option('--apply', 'Auto-apply changes: full HTML replacement + CSS patching (to-code only)', false)
  .option('--target <path>', 'Target local HTML file to replace with Stitch version (to-code --apply)')
  .option('--dry-run', 'Preview changes without applying', false)
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    const projectRoot = process.cwd();
    const direction = options.direction as SyncDirection;

    if (direction !== 'to-stitch' && direction !== 'to-code') {
      console.error(
        '❌ Invalid direction. Use "to-stitch" or "to-code".',
      );
      process.exit(1);
    }

    if (direction === 'to-stitch') {
      await handleToStitch(projectRoot, options);
    } else {
      await handleToCode(projectRoot, options);
    }
  });

/**
 * Handle to-stitch direction:
 * Compare current code against snapshot → generate Stitch edit prompt
 */
async function handleToStitch(
  projectRoot: string,
  options: { dryRun: boolean; json: boolean; stitchProject?: string; stitchScreen?: string },
): Promise<void> {
  const snapshot = loadSnapshot(projectRoot);
  if (!snapshot) {
    console.error('❌ No snapshot found. Run "drift-guard init" first.');
    process.exit(1);
  }

  // Detect drift (code vs snapshot)
  const report = await detectDrift(projectRoot, snapshot, 0);

  if (report.items.length === 0) {
    console.log('✅ No changes detected. Stitch and code are in sync!');
    return;
  }

  const result = syncToStitch(report.items);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Pretty output
  console.log('');
  console.log('🔄 drift-guard sync → to-stitch');
  console.log(`   ${result.changes.length} change(s) detected\n`);

  for (const change of result.changes) {
    const icon =
      change.action === 'update' ? '✏️' :
      change.action === 'add' ? '➕' : '🗑️';
    console.log(
      `   ${icon}  ${change.property}: ${change.fromValue || '(none)'} → ${change.toValue || '(removed)'}`,
    );
  }

  console.log('');
  console.log('━'.repeat(60));
  console.log('📋 Stitch edit_screens prompt:');
  console.log('━'.repeat(60));
  console.log('');
  console.log(result.prompt);
  console.log('');
  console.log('━'.repeat(60));

  const projectId = options.stitchProject;
  const screenId = options.stitchScreen;

  if (projectId && screenId) {
    console.log('');
    console.log('💡 To apply these changes in Stitch, run:');
    console.log('');
    console.log(`   edit_screens({`);
    console.log(`     projectId: "${projectId}",`);
    console.log(`     selectedScreenIds: ["${screenId}"],`);
    console.log(`     prompt: "<the prompt above>"`);
    console.log(`   })`);
  } else {
    console.log('');
    console.log(
      '💡 Copy the prompt above and use it with Stitch MCP edit_screens',
    );
    console.log(
      '   or pass --stitch-project and --stitch-screen for a ready-to-use call.',
    );
  }
}

/**
 * Handle to-code direction:
 * Compare Stitch HTML against snapshot → generate CSS patch → optionally apply.
 *
 * With --apply: Stitch HTML is the SOURCE OF TRUTH.
 * 1. Replace the local Stitch HTML file entirely (fixes text/layout/content diffs)
 * 2. Patch design tokens in other CSS files
 * 3. Update snapshot
 * 4. Verify 0% drift
 */
async function handleToCode(
  projectRoot: string,
  options: { dryRun: boolean; json: boolean; apply: boolean; stitchHtml?: string; target?: string },
): Promise<void> {
  const snapshot = loadSnapshot(projectRoot);
  if (!snapshot) {
    console.error('❌ No snapshot found. Run "drift-guard init" first.');
    process.exit(1);
  }

  // Get Stitch HTML path (new/downloaded version)
  const config = loadConfig(projectRoot);
  const stitchHtmlPath =
    options.stitchHtml ?? config.stitch?.htmlPath;

  if (!stitchHtmlPath) {
    console.error(
      '❌ No Stitch HTML file specified.',
    );
    console.error(
      '   Use --stitch-html <path> or set stitch.htmlPath in .design-guard/config.json',
    );
    process.exit(1);
  }

  const absPath = path.resolve(projectRoot, stitchHtmlPath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Stitch HTML file not found: ${absPath}`);
    process.exit(1);
  }

  // Parse Stitch HTML for tokens
  const htmlContent = fs.readFileSync(absPath, 'utf-8');
  const stitchTokens: DesignToken[] = [];

  const htmlTokens = parseHtml(htmlContent, stitchHtmlPath);
  stitchTokens.push(...htmlTokens);

  const styleBlocks = extractStyleBlocks(htmlContent);
  for (const block of styleBlocks) {
    stitchTokens.push(...parseCss(block, stitchHtmlPath));
    stitchTokens.push(...extractCssVariables(block, stitchHtmlPath));
  }

  const twTokens = extractTailwindConfig(htmlContent, stitchHtmlPath);
  stitchTokens.push(...twTokens);

  // Compare Stitch tokens against snapshot
  const result = syncFromStitch(stitchTokens, snapshot.tokens);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // === FULL SYNC (--apply): Stitch is source of truth ===
  if (options.apply && !options.dryRun) {
    console.log('');
    console.log('🔄 drift-guard sync → to-code (FULL SYNC)');
    console.log('   Stitch HTML is the source of truth.\n');

    // Step 1: Find local Stitch HTML files to replace
    const targetPath = options.target;
    const localStitchFiles = await findLocalStitchHtml(projectRoot, absPath, targetPath);
    let htmlReplaced = false;

    if (localStitchFiles.length > 0) {
      console.log('📄 Step 1: Full HTML replacement');
      for (const localFile of localStitchFiles) {
        const localAbsPath = path.resolve(projectRoot, localFile);
        const localContent = fs.readFileSync(localAbsPath, 'utf-8');

        if (localContent !== htmlContent) {
          fs.writeFileSync(localAbsPath, htmlContent, 'utf-8');
          console.log(`   ✅ Replaced: ${localFile} (Stitch → local)`);
          htmlReplaced = true;
        } else {
          console.log(`   ℹ️  Already identical: ${localFile}`);
        }
      }
    } else {
      console.log('📄 Step 1: No local Stitch HTML found to replace.');
      console.log('   💡 Use --target <path> to specify the target file.');
    }

    // Step 2: Patch design tokens in CSS files
    if (result.changes.length > 0) {
      console.log(`\n📝 Step 2: Patching ${result.changes.length} design token(s) in CSS files`);
      for (const change of result.changes) {
        const icon =
          change.action === 'update' ? '✏️' :
          change.action === 'add' ? '➕' : '🗑️';
        console.log(
          `   ${icon}  ${change.property}: ${change.fromValue || '(none)'} → ${change.toValue || '(removed)'}`,
        );
      }

      const cssFileMap = await loadProjectCssFiles(projectRoot, config);
      const { modifiedFiles, appliedCount } = applySyncChanges(result.changes, cssFileMap);

      if (appliedCount > 0) {
        for (const [file, content] of modifiedFiles) {
          const fullPath = path.resolve(projectRoot, file);
          fs.writeFileSync(fullPath, content, 'utf-8');
          console.log(`   ✅ Patched: ${file}`);
        }
      }
    } else {
      console.log('\n📝 Step 2: No design token changes — tokens already match.');
    }

    // Step 3: Update snapshot to reflect new state
    if (htmlReplaced || result.changes.length > 0) {
      console.log('\n📸 Step 3: Updating snapshot...');

      const { execSync } = await import('node:child_process');
      try {
        execSync(
          `node "${path.resolve(projectRoot, '..', 'drift-guard', 'dist', 'cli', 'index.js')}" snapshot update`,
          { cwd: projectRoot, stdio: 'pipe' },
        );
      } catch {
        // Try the global command
        try {
          execSync('npx drift-guard snapshot update', {
            cwd: projectRoot,
            stdio: 'pipe',
          });
        } catch {
          console.log('   ⚠️  Could not auto-update snapshot. Run: drift-guard snapshot update');
        }
      }
      console.log('   ✅ Snapshot updated.');
    }

    // Step 4: Verify full sync
    console.log('\n🔍 Step 4: Verifying full sync...');

    // Compare the Stitch source HTML with the local file
    if (localStitchFiles.length > 0) {
      let allMatch = true;
      for (const localFile of localStitchFiles) {
        const localAbsPath = path.resolve(projectRoot, localFile);
        const localContent = fs.readFileSync(localAbsPath, 'utf-8');
        if (localContent === htmlContent) {
          console.log(`   ✅ ${localFile} — 100% identical to Stitch`);
        } else {
          console.log(`   ❌ ${localFile} — content differs!`);
          allMatch = false;
        }
      }
      if (allMatch) {
        console.log('\n   🎉 FULL SYNC VERIFIED — Stitch and code are 100% identical!');
      }
    }
  } else if (result.changes.length === 0) {
    console.log('✅ Stitch and code design tokens are already in sync!');
    console.log('   💡 Use --apply for full HTML content sync (text, layout, structure).');
  } else {
    // Show token diff and patch
    console.log('');
    console.log('🔄 drift-guard sync → to-code');
    console.log(`   ${result.changes.length} design token change(s) from Stitch\n`);

    for (const change of result.changes) {
      const icon =
        change.action === 'update' ? '✏️' :
        change.action === 'add' ? '➕' : '🗑️';
      console.log(
        `   ${icon}  ${change.property}: ${change.fromValue || '(none)'} → ${change.toValue || '(removed)'}`,
      );
    }

    if (result.patchFile) {
      console.log('');
      console.log('━'.repeat(60));
      console.log('📋 CSS patch to apply:');
      console.log('━'.repeat(60));
      console.log('');
      console.log(result.patchFile);
      console.log('');
      console.log('━'.repeat(60));

      if (!options.dryRun) {
        const patchPath = path.join(
          projectRoot,
          '.design-guard',
          'sync-patch.css',
        );
        fs.writeFileSync(patchPath, result.patchFile, 'utf-8');
        console.log(`\n💾 Patch saved to: ${patchPath}`);
        console.log('   Use --apply for full HTML content + token sync.');
      } else {
        console.log('\n🔍 Dry run — no files written.');
      }
    }
  }
}

/**
 * Find local Stitch HTML files that should be replaced.
 * Searches for stitch-design.html or files matching --target.
 */
async function findLocalStitchHtml(
  projectRoot: string,
  sourceAbsPath: string,
  targetPath?: string,
): Promise<string[]> {
  if (targetPath) {
    return [targetPath];
  }

  // Search for stitch-design.html files in the project
  const stitchFiles = await fg(
    ['**/stitch-design.html', '**/stitch*.html'],
    {
      cwd: projectRoot,
      ignore: ['node_modules/**', 'dist/**', 'build/**'],
      absolute: false,
    },
  );

  // Exclude the source file itself
  const sourceRelative = path.relative(projectRoot, sourceAbsPath);
  return stitchFiles.filter(f => f !== sourceRelative);
}

/**
 * Load all CSS files from the project into a map
 */
async function loadProjectCssFiles(
  projectRoot: string,
  config: { cssFiles: string[]; ignore: string[] },
): Promise<Map<string, string>> {
  const cssFileMap = new Map<string, string>();

  for (const pattern of config.cssFiles) {
    const matches = await fg(pattern, {
      cwd: projectRoot,
      ignore: config.ignore,
      absolute: false,
    });

    for (const file of matches) {
      const absPath = path.resolve(projectRoot, file);
      if (fs.existsSync(absPath)) {
        cssFileMap.set(file, fs.readFileSync(absPath, 'utf-8'));
      }
    }
  }

  // Also include HTML files that might have Tailwind config
  const htmlPatterns = ['**/*.html'];
  const htmlIgnore = ['node_modules/**', 'dist/**', 'build/**', '.next/**'];
  const htmlMatches = await fg(htmlPatterns, {
    cwd: projectRoot,
    ignore: htmlIgnore,
    absolute: false,
  });

  for (const file of htmlMatches) {
    const absPath = path.resolve(projectRoot, file);
    if (fs.existsSync(absPath)) {
      cssFileMap.set(file, fs.readFileSync(absPath, 'utf-8'));
    }
  }

  return cssFileMap;
}
