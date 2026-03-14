# Reddit r/webdev Showoff Saturday — Launch Post

**Target**: r/webdev — Showoff Saturday (2026-03-15)
**URL**: https://www.reddit.com/r/webdev/

---

## Post Title

```
[Showoff Saturday] I built drift-guard — a CLI that stops AI coding agents (Cursor, Claude Code, Copilot) from destroying your UI design
```

---

## Post Body

---

Hey r/webdev,

I want to share something I built after getting burned one too many times.

**The problem:** I'd spend hours getting a UI *exactly* right — spacing, colors, that perfect border-radius. Then I'd ask Claude Code or Cursor to "add a search bar" and come back to find my entire design had been silently rewritten. Wrong font weights. Blue changed to purple. My 3-column grid collapsed into a stack. I call this **Design Drift**, and it's become my #1 frustration with AI-assisted frontend work.

**What I built:** [drift-guard](https://github.com/Hwani-Net/drift-guard) — a zero-dependency CLI that locks your design tokens and DOM structure, then blocks AI agents from changing them.

**Three commands:**

```bash
npx drift-guard init     # Snapshot your design tokens + DOM structure
npx drift-guard rules    # Write protection rules for every AI tool
npx drift-guard check    # Detect drift — exits code 1 if anything changed
```

**How the protection actually works:**

`rules` generates tool-specific instruction files — `.cursorrules`, `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.clinerules` — that literally tell each AI agent "these tokens are off-limits." Combined with a pre-commit hook (`drift-guard hook install`), drifted code never lands.

**What it catches:**

- Color/font/spacing/shadow changes (the obvious stuff)
- DOM structural drift too — AI flattening your layout, removing `<header>` tags, changing your flex/grid fingerprint. This one surprised me the most when I built it.

**Example output when drift is found:**

```
❌ Drift Score: 11.11% (threshold: 10%)
   1 of 9 tokens changed

   Changes:
   ~ stitch-design.html --tw-primary: #8b5cf6 → #ff0000

   🏗️ Structure Drift:
      ⚠️ <header> removed (was 1)
```

**Why not just use Percy/BackstopJS?** Visual regression runs *after* deploy at the pixel level. drift-guard runs *before* commit at the code level — it's ~100x faster (< 1 second, no headless browser), and it *prevents* drift rather than catching it after it ships.

**Why CLI and not an MCP server?** MCP server registration eats 10,000–55,000+ tokens at conversation start. drift-guard is pure CLI — zero token overhead. AI agents already know how to run `npx drift-guard check`.

---

**Tech stack:** TypeScript, css-tree, cheerio. 130 tests (81 unit + 49 E2E). Zero runtime dependencies. MIT license.

- 📦 npm: `npx drift-guard init` (no global install needed)
- 🎮 Interactive demo: https://hwani-net.github.io/drift-guard/
- ⭐ GitHub: https://github.com/Hwani-Net/drift-guard

---

Has anyone else hit this "AI destroyed my design" problem? Curious how you've been dealing with it. Happy to answer questions about how the snapshot/diff logic works under the hood.

---

*Built this for myself, sharing in case it helps others. Feedback welcome.*

---

## Flair

`Showoff Saturday`

## Cross-post candidates

- r/programming
- r/javascript
- r/typescript
- r/svelte / r/reactjs / r/vuejs (as relevant)
- r/cursor (Cursor AI community)

## Engagement hooks (expected questions to prepare for)

- *"Does this work with Tailwind?"* → Yes, it scans compiled CSS or inline classes via `--from design.html`
- *"What if I intentionally change the design?"* → Run `drift-guard snapshot update` to rebaseline
- *"Can I set different thresholds per category?"* → Not yet, but it's on the roadmap
- *"Why not just lock the CSS file with git?"* → Because you need AI to be able to add new rules, just not change existing ones
- *"MCP overhead is exaggerated"* → Link to ADR-007 with the actual numbers
