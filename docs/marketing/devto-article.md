---
title: "How I Built drift-guard: A CLI to Stop AI Agents from Destroying Your Design"
published: false
description: "AI coding agents are great at adding features, terrible at preserving design. Here's how drift-guard locks your design tokens and DOM structure before AI touches your code."
tags: webdev, ai, opensource, typescript
cover_image: https://raw.githubusercontent.com/Hwani-Net/drift-guard/main/docs/assets/cli-demo.png
canonical_url: https://github.com/Hwani-Net/drift-guard
---

# How I Built drift-guard: A CLI to Stop AI Agents from Destroying Your Design

## The Real Problem Nobody's Talking About

It's 2026 and AI coding agents are everywhere. Cursor, Claude Code, Codex, GitHub Copilot, Cline — they can build features in minutes.

But here's the dirty secret: **they can't stop themselves from destroying your design.**

You spend hours perfecting a landing page. Beautiful purple gradients. Carefully chosen Inter font. Consistent 8px border radius system. You hand it to an AI agent with a simple request: *"Add a contact form."*

The form gets added. But your primary color is now blue. Your font is now system-ui. Your border radius is 4px on some elements, 12px on others. The header that was `<header>` is now a `<div>`.

I call this **Design Drift** — and after experiencing it for the 50th time, I built a tool to fix it.

## Introducing drift-guard

**drift-guard** is a zero-config CLI that protects your UI from AI coding agents' design changes.

```bash
# Step 1: Lock your design
npx drift-guard init --from stitch-design.html

# Step 2: Tell AI agents about the rules
npx drift-guard rules

# Step 3: After AI makes changes, check for drift
npx drift-guard check
```

### What It Protects

drift-guard tracks **7 categories** of design tokens plus **DOM structure**:

| Category | What it locks |
|----------|--------------|
| 🎨 Colors | `color`, `background-color`, `border-color`, CSS variables |
| 📝 Fonts | `font-family`, `font-size`, `font-weight`, `line-height` |
| 📏 Spacing | `margin`, `padding`, `gap` |
| 🌫️ Shadows | `box-shadow`, `text-shadow` |
| ⭕ Radius | `border-radius` |
| 📐 Layout | `display`, `flex-direction`, `justify-content` |
| ✨ Effects | `backdrop-filter`, `filter`, `animation`, `transition` |
| 🏗️ Structure | Semantic tags, DOM depth, layout hash, child sequence |

### How It Works Under the Hood

**1. Token Extraction**

drift-guard uses [css-tree](https://github.com/csstree/csstree) for CSS parsing and [cheerio](https://github.com/cheeriojs/cheerio) for HTML. It walks the AST and extracts every design-relevant declaration into categorized tokens.

For Stitch/Tailwind projects, it also parses `<script id="tailwind-config">` tags to extract inline Tailwind theme values — a pattern that pure CSS parsers miss completely.

**2. Structure Fingerprinting**

New in v0.2.0 — drift-guard computes a structural fingerprint using:
- Semantic tag counts (header, nav, main, section, footer)
- Max DOM nesting depth
- SHA-256 hash of flex/grid layout elements
- SHA-256 hash of body's direct child sequence

This catches AI agents that "flatten" your layout or replace semantic HTML with generic `<div>`s.

**3. AI Agent Rules Generation**

The `rules` command generates protection files for 5 tools simultaneously:

```bash
npx drift-guard rules
# ✅ .cursorrules
# ✅ CLAUDE.md
# ✅ AGENTS.md
# ✅ .github/copilot-instructions.md
# ✅ .clinerules
```

Each file contains your locked tokens in a format the AI tool understands, with instructions like:

```
### Colors (DO NOT CHANGE)
- `--tw-primary: #8b5cf6`
- `--tw-background-dark: #101622`
```

## The CLI vs MCP Decision

This was the biggest architectural decision. When I started, I built both a CLI and an MCP (Model Context Protocol) server wrapper.

Then I looked at the numbers:

| Approach | Token overhead | Cost per month* |
|----------|---------------|-----------------|
| MCP server | ~10,000+ tokens per tool | ~$55/month |
| CLI | 0 tokens | ~$3/month |

*Based on Scalekit's benchmark for equivalent task volume*

With the ongoing [MCP token bloat debate](https://news.ycombinator.com/item?id=43587648) (55K+ tokens consumed before you start coding), keeping drift-guard as a pure CLI felt right. AI agents already know how to run shell commands — no schema registration needed.

I wrote this up as **ADR-007: CLI-First Strategy** in the project. The MCP code exists in the repo but isn't published to npm.

## Stale Snapshot Warning (v0.2.2)

A subtle but important feature: if your snapshot is 7+ days old, drift-guard warns you:

```
⚠️  Snapshot is 11 days old (created 2026-03-01).
   If your design has changed, run: drift-guard init --from <latest.html>
```

Old snapshots = false positives. This nudge prevents teams from forgetting to update after intentional design changes.

## CI/CD Integration

drift-guard exits with code 1 when drift exceeds the threshold — perfect for CI:

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

Add `drift-guard hook install` locally for pre-commit blocking — drifted commits never even get pushed.

## Real-World Testing

I tested drift-guard against a real Stitch-generated landing page (225 lines of HTML with Tailwind config):

| Test | Result |
|------|--------|
| Initialize from Stitch HTML | ✅ 9 tokens + structure fingerprint |
| No change → check | ✅ 0% drift, exit 0 |
| Change primary color #8b5cf6 → #ff0000 | ✅ 11.11% drift detected, exit 1 |
| Replace `<header>` with `<div>` | ✅ Structure drift detected, exit 1 |
| Generate AI rules | ✅ 5 files for all major AI tools |
| Accept changes via snapshot update | ✅ New baseline, 0% drift |
| Stale snapshot (11 days) | ✅ Warning displayed |

130 automated tests (81 unit + 49 E2E) passing on Node 18/20/22.

## What's Next

- **Figma/Stitch API integration** for automated snapshot updates
- **Threshold per category** (allow color drift but block font changes)
- **Tree diff for DOM** (show exactly which elements changed, not just hashes)
- **VS Code extension** with inline drift warnings

## Try It

```bash
npx drift-guard init --from your-design.html
npx drift-guard rules
npx drift-guard check
```

- **GitHub**: [Hwani-Net/drift-guard](https://github.com/Hwani-Net/drift-guard)
- **npm**: [@stayicon/drift-guard](https://www.npmjs.com/package/@stayicon/drift-guard)
- **License**: MIT

---

Have you experienced Design Drift with AI coding agents? I'd love to hear your stories and what you'd want from a tool like this.
