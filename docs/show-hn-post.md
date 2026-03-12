# Show HN: drift-guard – Protect your UI from AI agents' design drift

Hi HN,

I built **drift-guard** — a CLI that locks your design tokens and DOM structure before AI coding agents (Cursor, Claude Code, Codex, Copilot, Cline) touch your code, then detects and blocks unauthorized changes.

## The Problem

You spend hours crafting a beautiful UI in Figma/Stitch/v0. You bring it into your codebase. It looks perfect.

Then you ask an AI agent to "add a login feature"... and your design is gone. Colors changed. Fonts shifted. Your 3-column grid became a stack. This is **Design Drift** — the #1 frustration of AI-assisted frontend dev in 2026.

## How it works

```
npx drift-guard init          # Lock design tokens + DOM structure
npx drift-guard rules         # Generate AI protection rules
npx drift-guard check         # Detect drift (exit code 1 = drift found)
```

1. `init` scans your CSS/HTML and snapshots all design tokens (colors, fonts, spacing, shadows, radius, layout, effects) + a structural fingerprint of your DOM (semantic tags, nesting depth, flex/grid layout hash)
2. `rules` generates rule files for 5 AI tools (.cursorrules, CLAUDE.md, AGENTS.md, copilot-instructions.md, .clinerules) — these tell AI agents "don't touch the design"
3. `check` compares current state against the snapshot and exits with code 1 if drift exceeds the threshold — CI/pre-commit ready

## Example output

```
🛡️  drift-guard check

⚠️  Snapshot is 11 days old (created 2026-03-01).
   If your design has changed, run: drift-guard init --from <latest.html>

Comparing against snapshot from 2026-03-01...

❌ Drift Score: 11.11% (threshold: 10%)
   1 of 9 tokens changed

   Changes:
   ~ stitch-design.html --tw-primary: #8b5cf6 → #ff0000

   🏗️ Structure Drift:
      ⚠️ <header> removed (was 1)
```

## Key design decisions

- **Zero token overhead**: Pure CLI — no MCP server. With the MCP token bloat debate going on (55K+ tokens consumed before you even start coding), drift-guard deliberately stays CLI-only. AI agents already know how to run `npx drift-guard check`.
- **< 1 second**: Static analysis with css-tree + cheerio. No headless browser.
- **Stale snapshot warning**: If your snapshot is 7+ days old, drift-guard warns you. Old baselines = false positives.
- **Structure + Style**: Not just CSS tokens — DOM structural changes (semantic tag removal, layout flattening, depth changes) are caught too.
- **Pre-commit hook**: `drift-guard hook install` — blocks drifted commits before they land.

## Why not visual regression (BackstopJS/Percy)?

Those work *after* deploy using pixel screenshots. drift-guard works *before* commit at the code level — it's 100x faster, needs no browser, and it *prevents* drift rather than catching it after the fact.

## Tech

TypeScript, css-tree, cheerio. 130 tests (81 unit + 49 E2E). GitHub Actions CI on Node 18/20/22. MIT license.

GitHub: https://github.com/Hwani-Net/drift-guard
npm: `npm i -g @stayicon/drift-guard` (or just `npx drift-guard init`)

I'd love feedback. Is "Design Drift" something you've experienced with AI coding tools? What would make this more useful for your workflow?
