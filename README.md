# 🛡️ drift-guard

<p align="center">
  <img src="https://raw.githubusercontent.com/Hwani-Net/drift-guard/master/docs/assets/hero-banner-v2.png" alt="drift-guard — Stop AI from destroying your design" width="100%">
</p>

<p align="center">
  <strong>AI coding agents will break your design. drift-guard won't let them.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@stayicon/drift-guard"><img src="https://img.shields.io/npm/v/@stayicon/drift-guard?style=for-the-badge&color=blue" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License: MIT"></a>
  <a href="https://github.com/Hwani-Net/drift-guard"><img src="https://img.shields.io/badge/tests-130%2F130-brightgreen?style=for-the-badge" alt="Tests"></a>
  <a href="https://www.npmjs.com/package/@stayicon/drift-guard"><img src="https://img.shields.io/badge/dependencies-zero-blue?style=for-the-badge" alt="Zero Dependencies"></a>
</p>

<p align="center">
  <b>
    <a href="https://hwani-net.github.io/drift-guard/">🎮 Interactive Demo</a> ·
    <a href="https://www.npmjs.com/package/@stayicon/drift-guard">📦 npm</a> ·
    <a href="#quick-start">🚀 Quick Start</a> ·
    <a href="#design-dictatorship">🛡️ Design Dictatorship</a>
  </b>
</p>

---

## 😱 The Problem: AI Agents Are Destroying Your Designs

You spend days perfecting your UI in Figma, Stitch, or v0. You bring it into the codebase. It looks *exactly* right.

Then you tell an AI agent (Cursor, Claude Code, Copilot) to *"add a login feature."*

<p align="center">
  <img src="https://raw.githubusercontent.com/Hwani-Net/drift-guard/master/docs/assets/drift-before-after.png" alt="Design before and after AI agent drift" width="850">
</p>

**Your colors change. Your font weights shift. Your 3-column grid becomes a vertical stack.**

This is **Design Drift** — the #1 silent killer of AI-assisted frontend development in 2026. If you're not checking every line of CSS the AI writes, your design is already dying.

---

## 🔒 The Solution: drift-guard

drift-guard is a zero-dependency CLI that locks your design tokens and DOM structure, then **forces AI agents to obey them.**

```bash
npx drift-guard init     # 1. Lock your design (CSS vars, Tailwind, DOM Structure)
npx drift-guard rules    # 2. Inject protection rules into AI tool context
npx drift-guard check    # 3. Detect drift & block non-compliant code
```

<p align="center">
  <img src="https://raw.githubusercontent.com/Hwani-Net/drift-guard/master/docs/assets/cli-demo.webp" alt="drift-guard CLI demo" width="750">
</p>

---

## 🏛️ Design Dictatorship Protocol (ADR-008)

Why just *detect* drift when you can *prevent* it? 

`drift-guard rules` generates tool-specific instructions (`.cursorrules`, `CLAUDE.md`, `AGENTS.md`) that establish a **Design Dictatorship**. It tells the AI: *"You are allowed to write logic, but you are FORBIDDEN from touching these specific design tokens."*

<p align="center">
  <img src="https://raw.githubusercontent.com/Hwani-Net/drift-guard/master/docs/assets/design-dictatorship.png" alt="Design Dictatorship Illustration" width="800">
</p>

### ⚖️ The Law:
- **Locked Tokens**: Colors, Fonts, Spacing, Radius, Shadows.
- **Structural Integrity**: Semantic tags, nesting depth, layout fingerprints.
- **Zero-Tolerance**: Any drift > 10% (configurable) triggers a hard failure in CI.

---

## ⚡ Zero-Token Architecture: Why CLI, Not MCP?

Most AI tools suggest using **MCP (Model Context Protocol)** servers. But there's a hidden cost:

| Aspect | MCP Server | **drift-guard CLI** |
|--------|------------|----------------------|
| **Starting Cost** | 10k - 50k tokens (Registry) | **0 tokens** |
| **Context Load** | Heavy (Server definitions) | **Zero** |
| **Compatibility** | Needs MCP Support | **Every CLI-capable tool** |
| **Speed** | Network Latency | **Instant (Local)** |

AI agents already know how to run terminal commands. drift-guard leverages this tribal knowledge to protect your design without eating your token budget.

---

## 🚀 Quick Start

### 1. Lock your design
Scan your project to create a snapshot of your design tokens.
```bash
npx drift-guard init
```
*Pro tip: Use `--from design.html` to lock directly from a Stitch/Figma export.*

### 2. Generate AI protection rules
Create rule files for Cursor, Claude Code, Copilot, etc.
```bash
npx drift-guard rules
```

### 3. Check for drift
Run this after any AI session or in your CI pipeline.
```bash
npx drift-guard check
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **Token Protection** | Locks HSL/HEX colors, font-families, spacing scales, and shadows. |
| 🏗️ **DOM Fingerprinting** | (v0.2.0+) Detects when an AI agent changes your layout structure or semantic tags. |
| 🤖 **Multi-Agent Rules** | Supports `.cursorrules`, `CLAUDE.md`, `AGENTS.md`, `.clinerules`, and more. |
| 🪝 **Pre-commit Hooks** | Stop drifted designs from ever being committed to your main branch. |
| 🌐 **Stitch Sync** | Seamlessly sync your code's truth back to Stitch/v0 designs. |
| 📦 **Zero Deps** | Tiny, fast, and audit-friendly. |

---

## 🛠️ CI/CD Integration

Block PRs that violate your design tokens.

```yaml
# .github/workflows/design-guard.yml
name: Design Guard
on: [pull_request]
jobs:
  check-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx drift-guard check --ci
```

---

## 🎮 Programmatic API

```typescript
import { createSnapshot, detectDrift, generateRules } from 'drift-guard';

// Lock your design
const snapshot = await createSnapshot('./src');

// Detect drift
const report = await detectDrift('./src', snapshot);
console.log(`Drift: ${report.driftScore}%`);
```

---

## Configuration

After `drift-guard init`, configure in `.design-guard/config.json`:

```json
{
  "cssFiles": ["src/**/*.css", "app/**/*.css"],
  "htmlFiles": ["**/*.html"],
  "threshold": 10,
  "trackCategories": ["color", "font", "spacing", "shadow", "radius", "layout"],
  "ignore": ["node_modules/**", "dist/**"]
}
```

---

## 📜 The Philosophy

> **AI should add features. Not destroy design.**

drift-guard doesn't fight AI — it teaches AI where the boundaries are. Your design tokens are the constitution. AI agents follow the law.

Your design is your brand. Your users' trust. Your hours of craft. **drift-guard keeps it that way.**

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT © drift-guard contributors
