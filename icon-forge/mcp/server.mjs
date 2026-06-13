#!/usr/bin/env node
// icon-forge MCP server.
// Exposes the "populate your environment with the icons" capability as MCP tools:
//   - list_targets    : what platforms are supported and where each installs
//   - detect_target   : sniff a project dir and report its platform
//   - install_icon_set: copy a generated icon set into the live project + wire loaders
//
// Registered by the icon-forge plugin via .mcp.json. Run standalone with:
//   node server.mjs
// (after `npm install` in this folder).

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TARGETS, detectTarget, installIconSet } from "./targets.mjs";

const server = new McpServer({ name: "icon-forge", version: "0.1.0" });

const textResult = (obj) => ({
  content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }],
});

const errorResult = (err) => ({
  isError: true,
  content: [{ type: "text", text: `icon-forge error: ${err?.message || String(err)}` }],
});

server.registerTool(
  "list_targets",
  {
    title: "List install targets",
    description:
      "List the platforms icon-forge can install an icon set into, and where each one places files.",
    inputSchema: {},
  },
  async () => textResult(
    Object.entries(TARGETS).map(([id, t]) => ({ target: id, label: t.label, installs: t.installs }))
  )
);

server.registerTool(
  "detect_target",
  {
    title: "Detect project platform",
    description:
      "Inspect a project directory and report which platform it is (blender, web, vscode-extension, electron, generic) with the evidence used and the recommended install layout.",
    inputSchema: {
      projectDir: z.string().describe("Absolute path to the project root to inspect."),
    },
  },
  async ({ projectDir }) => {
    try {
      return textResult(detectTarget(projectDir));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  "install_icon_set",
  {
    title: "Install icon set into environment",
    description:
      "Copy a generated icon set (SVG/PNG) into a project's platform-native location and write the loader/manifest that wires it in: Blender previews loader, web favicon+sprite+webmanifest, VS Code contributes snippet, Electron build icons, or a generic indexed folder. Returns the list of files written and next steps. If `target` is omitted it is auto-detected.",
    inputSchema: {
      projectDir: z.string().describe("Absolute path to the target project root."),
      iconsDir: z
        .string()
        .describe("Absolute path to the generated icon set (looks in ., ./svg, ./png for .svg/.png)."),
      target: z
        .enum(["blender", "vscode-extension", "web", "electron", "generic"])
        .optional()
        .describe("Force a platform. Omit to auto-detect from projectDir."),
      options: z
        .object({
          appName: z.string().optional(),
          shortName: z.string().optional(),
          themeColor: z.string().optional(),
          backgroundColor: z.string().optional(),
        })
        .optional()
        .describe("Web manifest fields (used for the web target's site.webmanifest)."),
    },
  },
  async ({ projectDir, iconsDir, target, options }) => {
    try {
      return textResult(installIconSet({ projectDir, iconsDir, target, options }));
    } catch (err) {
      return errorResult(err);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
