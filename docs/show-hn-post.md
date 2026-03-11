# Show HN: drift-guard – Protect your UI from AI agents' design drift

Hi HN,

I built **drift-guard** — a zero-dependency\* CLI that locks your CSS design tokens before AI coding agents (Cursor, Claude Code, Codex, Copilot, Cline) touch your code, then detects and blocks unauthorized changes.

## The Problem

You spend hours crafting a beautiful UI in Figma/Stitch/v0. You bring it into your codebase. It looks perfect.

Then you ask an AI agent to "add a login feature"... and your design is gone. Colors changed. Fonts shifted. Spacing broke. This is **Design Drift** — and it's the #1 pain point of AI-assisted frontend development in 2026.

## How it works

```
npx drift-guard init          # Lock 45 design tokens
npx drift-guard rules         # Generate AI protection rules
npx drift-guard check         # Detect drift after AI changes
```

1. `init` scans your CSS/HTML and creates a snapshot of all design tokens (colors, fonts, spacing, shadows, radius, layout)
2. `rules` generates rule files for 5 AI tools (.cursorrules, CLAUDE.md, AGENTS.md, copilot-instructions.md, .clinerules) — these tell AI agents "don't touch the design"
3. `check` compares current state against the snapshot and reports drift with a score

## Key features

- **Zero config**: Just `npx drift-guard init` and you're protected
- **< 1 second**: Static CSS analysis, no headless browser needed
- **5 AI tools**: Cursor, Claude Code, Codex/Gemini, GitHub Copilot, Cline
- **Pre-commit hook**: `drift-guard hook install` blocks drifted commits
- **CI/CD ready**: `drift-guard check --ci` with exit codes
- **Free forever**: No API keys, no subscriptions, fully local

## Why not visual regression testing?

Tools like BackstopJS/Percy work *after* deploy (QA stage) using pixel-level screenshots. drift-guard works *before* commit (dev stage) at the code level — it's 100x faster and doesn't need a browser.

## Tech

TypeScript, css-tree for parsing, cheerio for HTML. 76 tests (54 unit + 22 E2E). MIT license.

GitHub: https://github.com/Hwani-Net/drift-guard
npm: `npm i -g @stayicon/drift-guard`

\* 5 lightweight runtime deps: chalk, cheerio, commander, css-tree, fast-glob

---

I'd love feedback on the approach. Is "Design Drift" something you've experienced with AI coding tools? What would make this more useful for your workflow?
