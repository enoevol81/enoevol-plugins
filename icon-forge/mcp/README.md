# icon-forge MCP server

Stdio MCP server that installs a generated icon set into a live project. Bundled with the
`icon-forge` Claude Code plugin and registered automatically via the plugin's `.mcp.json`.

## Setup

```bash
npm install        # installs @modelcontextprotocol/sdk + zod
```

Requires Node ≥ 18. The plugin launches it as `node ${CLAUDE_PLUGIN_ROOT}/mcp/server.mjs`
at session start — restart the Claude Code session after `npm install`. If deps are
missing, the server exits immediately with an actionable "[icon-forge] MCP server
dependencies are not installed" message in the MCP logs instead of a raw module-not-found
stack.

## Tools

| Tool | Args | Returns |
|------|------|---------|
| `list_targets` | — | Supported platforms and where each installs. |
| `detect_target` | `projectDir` | `{ target, label, confidence, evidence[], recommendedInstall }` |
| `install_icon_set` | `projectDir`, `iconsDir`, `target?`, `options?` | `{ target, iconsFound, wrote[], notes[], nextSteps[] }` |

`install_icon_set` looks for `.svg`/`.png` in `iconsDir`, `iconsDir/svg`, and `iconsDir/png`,
then copies them into the platform-native location and writes the loader/manifest. If
`target` is omitted it is auto-detected from `projectDir`.

Supported targets: `blender`, `web`, `vscode-extension`, `electron`, `generic`.

`options` (web only): `{ appName, shortName, themeColor, backgroundColor }` → `site.webmanifest`.

## Files

- `server.mjs` — MCP wiring (tool registration, stdio transport).
- `targets.mjs` — detection heuristics + per-target install logic + templates. No external
  deps beyond the Node stdlib; testable in isolation.

## Manual run

```bash
node server.mjs        # speaks MCP over stdio
```

## Notes

This server places files and writes loaders/manifests — it does **not** transcode images.
Produce the PNG sizes with the skill's `scripts/rasterize.py` first; the installer wires
whatever `.svg`/`.png` it finds.
