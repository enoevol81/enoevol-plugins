# Environment Install (the MCP hookup)

How icon-forge populates the **live project** with the generated icons. The plugin bundles
an MCP server (`icon-forge`) that does this; this file documents its tools, the per-target
layout, and the manual fallback if the server isn't connected.

## The icon-forge MCP server

Registered automatically by the plugin via `.mcp.json` (runs `node mcp/server.mjs`).
**One-time setup:** the server needs its deps installed —
`cd <plugin>/mcp && npm install` (installs `@modelcontextprotocol/sdk` + `zod`).

### Tools

| Tool | Args | What it does |
|------|------|--------------|
| `list_targets` | — | Lists supported platforms and where each installs. |
| `detect_target` | `projectDir` | Sniffs the project and returns `{target, confidence, evidence, recommendedInstall}`. |
| `install_icon_set` | `projectDir`, `iconsDir`, `target?`, `options?` | Copies the icon set into the platform-native location and writes the loader/manifest. `target` auto-detects if omitted. |

`install_icon_set` looks for `.svg`/`.png` in `iconsDir`, `iconsDir/svg`, and `iconsDir/png`.
It returns `{ target, iconsFound, wrote[], notes[], nextSteps[] }`.

`options` (web target): `{ appName, shortName, themeColor, backgroundColor }` → written into
`site.webmanifest`.

### Detection signals

- **blender** — `blender_manifest.toml`, or a `.py` with `bl_info` / `import bpy`.
- **vscode-extension** — `package.json` with `engines.vscode` or `contributes`.
- **electron** — `package.json` depends on `electron`.
- **web** — `package.json` depends on react/next/vue/svelte/vite/angular/astro/solid, or a
  `public/` dir / `index.html`, or any `package.json` (fallback).
- **generic** — no signal found.

## Per-target install layout

| Target | Writes |
|--------|--------|
| **blender** | PNGs → `<project>/icons/`; `<project>/icon_forge_icons.py` (a `bpy.utils.previews` loader exposing `register_icons()` / `unregister_icons()` / `get_icon(id)`). |
| **web** | SVG/PNG → `<project>/public/icons/` (or `./icons` if no `public/`); `sprite.svg`; `icon-forge-head.html` (favicon `<link>` snippet); `site.webmanifest`. |
| **vscode-extension** | SVG/PNG → `<project>/icons/`; `icon-forge.contributes.json` (file list + how to reference from `contributes`). |
| **electron** | PNG/SVG → `<project>/build/icons/` (electron-builder convention). |
| **generic** | SVG/PNG → `<project>/icons/`; `icons.index.json`. |

## Typical Phase-6 call sequence

```
detect_target  { projectDir: "C:/path/to/project" }
# confirm target, then:
install_icon_set {
  projectDir: "C:/path/to/project",
  iconsDir:   "C:/path/to/project-icons",   # icon-forge output dir (has svg/ + png/)
  options:    { appName: "My App", themeColor: "#101010" }   # web only
}
```

Then surface the returned `wrote[]` and `nextSteps[]` to the user.

## Live Blender bonus

For a **running** Blender session with a Blender MCP connected, you can register the
previews at runtime (so icons appear without restarting) by executing the generated
`icon_forge_icons.py` logic via that MCP. The on-disk loader the install writes is the
durable path — the live registration is just immediate feedback.

## Manual fallback (no MCP server)

If the `icon-forge` MCP isn't connected, do the install by hand:

- **blender** — copy `png/` into the add-on's `icons/`, copy
  `scripts/install/blender_previews.py` in as the loader, fill `ICON_FILES`, and call it
  from `register()`/`unregister()`.
- **web** — copy `svg/` + favicons into `public/icons/`, build a sprite, and paste the
  `<link>` tags into `<head>`.
- Other targets — drop the files into the layout in the table above.
