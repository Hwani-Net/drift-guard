# Reddit r/webdev Post

## Title
I built a CLI that stops AI agents from destroying your design when they write code

## Body

Every time I ask Cursor/Claude Code/Codex to "add a feature," it nukes my carefully crafted design. Colors change. Fonts shift. My 3-column grid becomes a stack. Sound familiar?

I built **drift-guard** to fix this. It's a free, open-source CLI:

```bash
npx drift-guard init --from design.html   # Lock design tokens + DOM structure
npx drift-guard rules                      # Generate protection rules for AI tools
npx drift-guard check                      # Detect drift (exit 1 = blocked)
```

**What it does:**
- Snapshots your CSS design tokens (colors, fonts, spacing, radius, shadows, layout, effects) + DOM structural fingerprint
- Generates rule files for **5 AI tools**: Cursor (.cursorrules), Claude Code (CLAUDE.md), Codex (AGENTS.md), Copilot, Cline
- Detects drift with exact change reporting: `--tw-primary: #8b5cf6 → #ff0000`
- Pre-commit hook + CI/CD ready (exit code 1 for drift)
- Warns you when your snapshot is stale (7+ days old)

**Why CLI instead of MCP?**

With the MCP token bloat debate (55K+ tokens consumed before you even start), I deliberately kept this as a pure CLI. Zero token overhead. AI agents already know how to run `npx drift-guard check`.

**Why not BackstopJS/Percy?**

Those are post-deploy pixel-level QA. drift-guard is pre-commit code-level prevention. < 1 second, no browser needed.

GitHub: https://github.com/Hwani-Net/drift-guard
npm: `@stayicon/drift-guard`

130 tests passing. TypeScript. MIT license.

Has anyone else struggled with AI agents destroying your design? Curious what your experience has been.

---

## Suggested Subreddits
- r/webdev (primary)
- r/Frontend
- r/reactjs (if applicable)
- r/programming
- r/coding
