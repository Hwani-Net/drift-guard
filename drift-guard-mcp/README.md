# @stayicon/drift-guard-mcp

> MCP server for [drift-guard](https://github.com/Hwani-Net/drift-guard) — Protect your UI from AI agents' design drift via [Model Context Protocol](https://modelcontextprotocol.io).

## Installation

```bash
npm install -g @stayicon/drift-guard-mcp
```

## Usage

### Claude Desktop / Cursor

Add to your MCP config (`claude_desktop_config.json` or Cursor settings):

```json
{
  "mcpServers": {
    "drift-guard": {
      "command": "npx",
      "args": ["-y", "@stayicon/drift-guard-mcp"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `drift_guard_init` | Create a design token snapshot (lock colors, fonts, spacing, shadows, radius, layout + DOM structure) |
| `drift_guard_check` | Check for design drift against the locked snapshot |
| `drift_guard_rules` | Generate AI agent protection rules (Cursor, Claude Code, Codex, Copilot, Cline) |
| `drift_guard_sync` | Bidirectional sync between Stitch/Figma HTML and local code |

## License

MIT
