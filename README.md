# 🛡️ drift-guard

**Protect your UI from AI coding agents' design drift.**

> When AI writes code, your design survives.

[![npm version](https://badge.fury.io/js/drift-guard.svg)](https://www.npmjs.com/package/drift-guard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img src="docs/assets/cli-demo.png" alt="drift-guard CLI demo" width="680">
</p>

---

## The Problem

You created a beautiful design in Stitch/Figma/v0. You brought it into your codebase. It looks great.

Then you ask Claude Code / Codex / Cursor to *"add a login feature"*...

**And your design is gone.** Colors changed. Spacing broke. Fonts shifted. The original design? Nowhere to be found.

This is **Design Drift** — the #1 pain point of AI-assisted frontend development in 2026.

## The Solution

**drift-guard** locks your design tokens before AI agents touch your code, then detects and blocks any unauthorized changes.

```bash
# 1. Lock your design
npx drift-guard init

# 2. Generate AI protection rules
npx drift-guard rules

# 3. After AI makes changes, check for drift
npx drift-guard check
```

## How It Works

```
┌─────────────────────────────────────────────────┐
│  Your Design (Stitch/Figma/CSS)                 │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │Color│ │Font │ │Space│ │Shade│ │Radius│      │
│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘      │
│     └───────┴───────┴───────┴───────┘          │
│                     │                           │
│              drift-guard init                   │
│                     │                           │
│         ┌───────────▼────────────┐              │
│         │  .design-guard/        │              │
│         │   snapshot.json  🔒    │              │
│         └───────────┬────────────┘              │
│                     │                           │
│          drift-guard rules                      │
│                     │                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │.cur- │ │CLAU- │ │AGEN- │ │copi- │ │.cli- │  │
│  │sor-  │ │DE.md │ │TS.md │ │lot   │ │ne-   │  │
│  │rules │ │      │ │      │ │inst. │ │rules │  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │
│                                                 │
│  AI agents now KNOW your design is protected 🛡️ │
└─────────────────────────────────────────────────┘
```

## Quick Start

### 1. Initialize (lock your design)

```bash
# Scan your project's CSS files
npx drift-guard init

# Or lock from a Stitch/HTML export
npx drift-guard init --from design.html
```

### 2. Generate AI protection rules

```bash
# Generate rules for ALL AI tools
npx drift-guard rules

# Or for a specific tool
npx drift-guard rules --format cursorrules
npx drift-guard rules --format claude-md
```

This creates rule files that tell AI agents: *"Don't touch these design tokens."*

### 3. Check for drift after AI changes

```bash
# Check if design tokens were changed
npx drift-guard check

# Set custom threshold (default: 10%)
npx drift-guard check --threshold 5

# JSON output for CI
npx drift-guard check --output json
```

### 4. Update snapshot (after intentional design changes)

```bash
npx drift-guard snapshot update
```

## What Gets Protected

| Category | Properties | Example |
|----------|-----------|---------|
| 🎨 Colors | `color`, `background-color`, `border-color`, CSS variables | `--primary: #1a73e8` |
| 📝 Fonts | `font-family`, `font-size`, `font-weight`, `line-height` | `font-family: Inter` |
| 📏 Spacing | `margin`, `padding`, `gap` | `padding: 16px 24px` |
| 🌫️ Shadows | `box-shadow`, `text-shadow` | `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` |
| ⭕ Radius | `border-radius` | `border-radius: 8px` |
| 📐 Layout | `display`, `flex-direction`, `justify-content`, `align-items` | `display: flex` |

## Supported AI Tools

drift-guard generates protection rules for:

- **Cursor** → `.cursorrules`
- **Claude Code** → `CLAUDE.md`
- **Codex / Gemini** → `AGENTS.md`
- **GitHub Copilot** → `.github/copilot-instructions.md`
- **Cline** → `.clinerules`

## CI/CD Integration

```yaml
# .github/workflows/design-guard.yml
name: Design Guard
on: [pull_request]
jobs:
  check-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npx drift-guard check --ci
```

## Configuration

After `drift-guard init`, config is stored in `.design-guard/config.json`:

```json
{
  "cssFiles": ["src/**/*.css", "app/**/*.css"],
  "htmlFiles": ["**/*.html"],
  "threshold": 10,
  "trackCategories": ["color", "font", "spacing", "shadow", "radius", "layout"],
  "ignore": ["node_modules/**", "dist/**"]
}
```

## Programmatic API

```typescript
import { createSnapshot, detectDrift, generateRules } from 'drift-guard';

// Create a snapshot
const snapshot = await createSnapshot('./my-project');

// Detect drift
const report = await detectDrift('./my-project', snapshot, 10);
console.log(`Drift score: ${report.driftScore}%`);

// Generate rules
const rules = generateRules(snapshot, 'claude-md');
```

## Why Not Visual Regression Testing?

| Feature | drift-guard | BackstopJS / Percy |
|---------|-------------|-------------------|
| **When** | Before commit (pre-commit) | After deploy (QA) |
| **What** | Design tokens (code-level) | Screenshots (pixel-level) |
| **AI-aware** | ✅ Generates agent rules | ❌ No AI integration |
| **Speed** | < 1 second | Minutes (browser rendering) |
| **Dependencies** | Zero (no browser) | Headless Chrome required |
| **Cost** | Free, forever | Percy: $99+/mo for teams |

## Philosophy

> AI should **add features**, not **destroy design**.

drift-guard doesn't fight AI — it teaches AI where the boundaries are. Your design tokens are the constitution. AI agents follow the law.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © drift-guard contributors
