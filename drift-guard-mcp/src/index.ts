#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createSnapshot,
  saveSnapshot,
  loadSnapshot,
  detectDrift,
  generateRules,
  saveRules,
  syncToStitch,
  syncFromStitch,
  scanProject,
} from "@stayicon/drift-guard";
import type { DesignSnapshot, DriftReport } from "@stayicon/drift-guard";

const server = new McpServer({
  name: "drift-guard",
  version: "0.2.0",
});

// ── Tool 1: drift_guard_init ──
server.tool(
  "drift_guard_init",
  "Create a design token snapshot. Locks all CSS design tokens (colors, fonts, spacing, shadows, border-radius, layout) and DOM structure fingerprint for design drift protection.",
  {
    projectRoot: z
      .string()
      .describe("Absolute path to the project root directory"),
    stitchHtml: z
      .string()
      .optional()
      .describe(
        "Optional path to a Stitch/Figma HTML file to include in scanning"
      ),
  },
  async ({ projectRoot, stitchHtml }) => {
    try {
      const snapshot = await createSnapshot(projectRoot, stitchHtml);
      const snapshotPath = saveSnapshot(projectRoot, snapshot);

      const snapshotAny = snapshot as unknown as Record<string, unknown>;
      const structure = snapshotAny.structure as { maxDepth?: number; semanticTags?: Record<string, number> } | undefined;
      const structureInfo = structure
        ? `\nDOM structure fingerprint: maxDepth=${structure.maxDepth}, semanticTags=${Object.keys(structure.semanticTags ?? {}).length}`
        : "";

      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Snapshot created: ${snapshot.tokens.length} design tokens locked.\nSaved to: ${snapshotPath}\nFiles scanned: ${snapshot.sourceFiles.length}${structureInfo}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Failed to create snapshot: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 2: drift_guard_check ──
server.tool(
  "drift_guard_check",
  "Check for design drift against the saved snapshot. Compares current CSS/HTML design tokens against the locked baseline and reports any changes with a drift score.",
  {
    projectRoot: z
      .string()
      .describe("Absolute path to the project root directory"),
    threshold: z
      .number()
      .optional()
      .default(10)
      .describe(
        "Drift threshold percentage. Use 0 for strict mode (any change fails)"
      ),
  },
  async ({ projectRoot, threshold }) => {
    try {
      const snapshot = loadSnapshot(projectRoot);
      if (!snapshot) {
        return {
          content: [
            {
              type: "text" as const,
              text: "❌ No snapshot found. Run drift_guard_init first.",
            },
          ],
          isError: true,
        };
      }

      const report = await detectDrift(projectRoot, snapshot, threshold);

      let text = `${report.passed ? "✅ PASS" : "🚨 DRIFT DETECTED"}\n`;
      text += `Drift Score: ${report.driftScore}% (threshold: ${report.threshold}%)\n`;
      text += `Changed: ${report.changedTokens} of ${report.totalTokens} tokens\n`;

      if (report.items.length > 0) {
        text += "\nChanges:\n";
        for (const item of report.items.slice(0, 15)) {
          const prop = item.original.property;
          const from = item.original.value;
          const to = item.current?.value ?? "[deleted]";
          text += `  ${item.changeType}: ${prop}: ${from} → ${to} (${item.original.file})\n`;
        }
        if (report.items.length > 15) {
          text += `  ... and ${report.items.length - 15} more\n`;
        }
      }

      const reportAny = report as unknown as Record<string, unknown>;
      const structureDrift = reportAny.structureDrift as { changed?: boolean; details?: string[] } | undefined;
      if (structureDrift?.changed) {
        text += "\n🏗️ Structure Drift:\n";
        for (const detail of structureDrift.details ?? []) {
          text += `  ⚠️ ${detail}\n`;
        }
      }

      return {
        content: [{ type: "text" as const, text }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Check failed: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 3: drift_guard_rules ──
server.tool(
  "drift_guard_rules",
  "Generate AI agent rule files from the design snapshot. Creates protection rules for Cursor (.cursorrules), Claude Code (CLAUDE.md), Codex/Gemini (AGENTS.md), GitHub Copilot, and Cline.",
  {
    projectRoot: z
      .string()
      .describe("Absolute path to the project root directory"),
    format: z
      .enum([
        "cursorrules",
        "claude-md",
        "agents-md",
        "copilot",
        "clinerules",
        "all",
      ])
      .optional()
      .default("all")
      .describe("Rule file format to generate"),
  },
  async ({ projectRoot, format }) => {
    try {
      const snapshot = loadSnapshot(projectRoot);
      if (!snapshot) {
        return {
          content: [
            {
              type: "text" as const,
              text: "❌ No snapshot found. Run drift_guard_init first.",
            },
          ],
          isError: true,
        };
      }

      const formats =
        format === "all"
          ? ([
              "cursorrules",
              "claude-md",
              "agents-md",
              "copilot",
              "clinerules",
            ] as const)
          : ([format] as const);

      const files: string[] = [];
      for (const fmt of formats) {
        const content = generateRules(snapshot, fmt);
        const filePath = saveRules(projectRoot, fmt, content);
        files.push(filePath);
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Generated ${files.length} rule file(s):\n${files.map((f) => `  📄 ${f}`).join("\n")}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Rule generation failed: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool 4: drift_guard_sync ──
server.tool(
  "drift_guard_sync",
  "Bidirectional sync between Stitch/Figma HTML and local code. 'to-stitch' generates a prompt for updating Stitch. 'to-code' replaces local HTML + patches CSS tokens from the Stitch source of truth.",
  {
    projectRoot: z
      .string()
      .describe("Absolute path to the project root directory"),
    direction: z
      .enum(["to-stitch", "to-code"])
      .describe("Sync direction: to-stitch or to-code"),
    stitchHtml: z
      .string()
      .optional()
      .describe("Path to the Stitch HTML file (required for to-code)"),
  },
  async ({ projectRoot, direction, stitchHtml }) => {
    try {
      const snapshot = loadSnapshot(projectRoot);
      if (!snapshot) {
        return {
          content: [
            {
              type: "text" as const,
              text: "❌ No snapshot found. Run drift_guard_init first.",
            },
          ],
          isError: true,
        };
      }

      if (direction === "to-stitch") {
        // syncToStitch takes DriftItem[] — run a check first to get the items
        const report = await detectDrift(projectRoot, snapshot, 0);
        const result = syncToStitch(report.items);
        return {
          content: [
            {
              type: "text" as const,
              text: result.changes.length === 0
                ? "✅ No changes detected. Stitch and code are in sync."
                : `🔄 ${result.changes.length} change(s) detected.\n\nStitch update prompt:\n${result.prompt ?? "No prompt generated."}`,
            },
          ],
        };
      } else {
        if (!stitchHtml) {
          return {
            content: [
              {
                type: "text" as const,
                text: "❌ --stitchHtml is required for to-code sync.",
              },
            ],
            isError: true,
          };
        }

        // syncFromStitch takes (stitchTokens, snapshotTokens)
        // We need to scan the stitch HTML to get its tokens
        const fs = await import("node:fs");
        const path = await import("node:path");
        const stitchPath = path.resolve(projectRoot, stitchHtml);
        if (!fs.existsSync(stitchPath)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ Stitch HTML file not found: ${stitchPath}`,
              },
            ],
            isError: true,
          };
        }

        // Re-scan with stitch HTML to get stitch tokens
        const { tokens: stitchTokens } = await scanProject(projectRoot, { cssFiles: [], htmlFiles: [], threshold: 10, trackCategories: ['color', 'font', 'spacing', 'shadow', 'radius', 'layout'], ignore: [] }, stitchHtml);
        const result = syncFromStitch(stitchTokens, snapshot.tokens);
        return {
          content: [
            {
              type: "text" as const,
              text: result.changes.length === 0
                ? "✅ No changes detected. Code and Stitch are in sync."
                : `🔄 ${result.changes.length} change(s) from Stitch:\n${result.changes.map((c) => `  ${c.action}: ${c.property}: ${c.fromValue} → ${c.toValue}`).join("\n")}`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ Sync failed: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Start server ──
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("drift-guard MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
