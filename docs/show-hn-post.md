# Show HN: drift-guard – Protect your UI from AI agents' design drift (v0.2.0: now detects DOM structure changes)

Hi HN,

I built **drift-guard** — a zero-dependency* CLI that locks your design tokens *and* DOM structure before AI coding agents (Cursor, Claude Code, Codex, Copilot, Cline) touch your code, then detects and blocks unauthorized changes.

## The Problem

You spend hours crafting a beautiful UI in Figma/Stitch/v0. You bring it into your codebase. It looks perfect.

Then you ask an AI agent to "add a login feature"... and your design is gone. Colors changed. Fonts shifted. Layout flattened. Your 3-column grid became a stack. This is **Design Drift** — the #1 pain point of AI-assisted frontend development in 2026.

## How it works

```
npx drift-guard init          # Lock design tokens + DOM structure
npx drift-guard rules         # Generate AI protection rules
npx drift-guard check         # Detect drift after AI changes
```

1. `init` scans your CSS/HTML and creates a snapshot of all design tokens (colors, fonts, spacing, shadows, radius, layout, effects) + a structural fingerprint of your DOM
2. `rules` generates rule files for 5 AI tools (.cursorrules, CLAUDE.md, AGENTS.md, copilot-instructions.md, .clinerules) — these tell AI agents "don't touch the design"
3. `check` compares current state against the snapshot and reports drift with a score

## What's new in v0.2.0

**DOM Structure Fingerprinting** — drift-guard now catches structural changes, not just style changes:

- Semantic tag counts (header, nav, main, section, footer)
- Max nesting depth (AI flattening your layout? caught.)
- Layout element hash (flex/grid changes)
- Child sequence hash (body children reordered? caught.)

```
🏗️ Structure Drift:
   ⚠️ maxDepth: 6 → 4
   ⚠️ section count: 3 → 2
   ⚠️ layoutHash changed
```

## Key features

- **Zero config**: Just `npx drift-guard init` and you're protected
- **< 1 second**: Static CSS analysis, no headless browser needed
- **Zero token overhead**: Pure CLI — no MCP server, no schema bloat, no context window tax
- **5 AI tools**: Cursor, Claude Code, Codex/Gemini, GitHub Copilot, Cline
- **Pre-commit hook**: `drift-guard hook install` blocks drifted commits
- **CI/CD ready**: `drift-guard check --ci` with exit codes
- **Bidirectional sync**: `drift-guard sync` — Stitch/Figma ↔ code synchronization
- **Free forever**: No API keys, no subscriptions, fully local

## Why CLI, not MCP?

With the ongoing MCP token bloat debate (GitHub MCP = 93 tools, ~55K tokens before you even start), drift-guard deliberately stays as a CLI. AI agents already know how to run `npx drift-guard check` — zero schema overhead. Your context window stays clean for actual coding.

## Why not visual regression testing?

Tools like BackstopJS/Percy work *after* deploy (QA stage) using pixel-level screenshots. drift-guard works *before* commit (dev stage) at the code level — it's 100x faster and doesn't need a browser.

## Tech

TypeScript, css-tree for parsing, cheerio for HTML. 130 tests (81 unit + 49 E2E). MIT license.

GitHub: https://github.com/Hwani-Net/drift-guard
npm: `npm i -g @stayicon/drift-guard`

\* 5 lightweight runtime deps: chalk, cheerio, commander, css-tree, fast-glob

---

I'd love feedback on the approach. Is "Design Drift" something you've experienced with AI coding tools? What would make this more useful for your workflow?
