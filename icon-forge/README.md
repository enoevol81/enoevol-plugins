# Icon Forge (Claude Code plugin)

Point it at **any project** and it designs a cohesive, native-looking **icon set** — then
**installs the icons into your live environment**.

It runs a multi-agent pipeline: detect the target platform (Blender add-on, web app/site,
VS Code extension, Electron/desktop, or a generic project), research that platform's icon
conventions, recon the project's function and aesthetic, ingest any **inspiration** you
provide, build an icon-set game plan, and emit:

- **Deterministic SVG sources + rasterized PNGs** — the production path for functional
  small UI icons. **Needs no fal.ai account, key, or network.**
- **FLUX.2 (fal.ai) prompts + a batch runner** *(optional)* — for hero art, larger
  decorative icons, logos, and style exploration. This tier alone needs a `FAL_KEY`.

Then a final **install** step uses the bundled **icon-forge MCP server** to populate the
project natively:

| Target | What gets installed |
|--------|---------------------|
| **Blender** | PNGs into `icons/` + a `bpy.utils.previews` loader (`icon_forge_icons.py`). |
| **Web** | `public/icons/` + an SVG sprite + favicon `<link>` snippet + `site.webmanifest`. |
| **VS Code extension** | `icons/` + a `contributes` reference snippet. |
| **Electron** | `build/icons/` for electron-builder. |
| **Generic** | `icons/` + an `icons.index.json`. |

## Install

Distributed via the [enoevol-plugins](https://github.com/enoevol81/enoevol-plugins)
marketplace.

```bash
# 1. Add the marketplace
/plugin marketplace add enoevol81/enoevol-plugins

# 2. Install the plugin
/plugin install icon-forge@enoevol-plugins
```

### One-time MCP server setup

The bundled MCP server needs its Node dependencies installed once:

```bash
cd <plugin-dir>/icon-forge/mcp
npm install
```

(`<plugin-dir>` is where the marketplace installed the plugin — usually the version-keyed
cache dir under `~/.claude/plugins/cache/enoevol-plugins/icon-forge/<version>/`.) Requires
Node ≥ 18. Restart the Claude Code session afterwards; it then auto-starts the
`icon-forge` MCP server via the plugin's `.mcp.json`. If the install was skipped, the
server logs a clear "dependencies are not installed" message (visible via `/mcp`) and the
skill falls back to a manual, hand-placed install — nothing else breaks.

## Use

Just ask for icons and point at a project:

> "Make an icon set for the add-on in `C:\Dev\sneaker_panel_pro`."
> "Generate a favicon + nav icon pack for this Next.js site. Here's some inspiration: …"

The skill asks only for what's missing (path, scope, optional inspiration), runs the
research + design agents in parallel, gets **one** approval on the game plan, then writes
the SVG/PNG set and calls the MCP server to install everything into the project — no
further interruptions.

To generate the optional FLUX art tier too, set `FAL_KEY` in your environment and run the
emitted `prompts/generate_fal.py` (`pip install fal-client`). Without a fal.ai account,
simply skip this — the SVG/PNG set is complete on its own.

## What's in the box

```
icon-forge/
├── .claude-plugin/plugin.json
├── .mcp.json                       # registers the icon-forge MCP server
├── mcp/                            # the bundled MCP server (Node, stdio)
│   ├── server.mjs
│   ├── targets.mjs                 # detection + install logic
│   └── package.json
└── skills/icon-forge/
    ├── SKILL.md
    ├── agents/                     # platform-standards, project-recon, icon-strategist,
    │                               #   art-director, prompt-smith
    ├── references/                 # platform-icon-spec, environment-install, fal-flux2
    └── scripts/                    # rasterize.py, generate_fal.py, install/ templates
```

## Honest scope

AI image generation (FLUX included) is unreliable for pixel-precise 16–32px UI icons — it
won't respect a grid or 1px strokes. So the **SVG path is the production path** for
functional small icons; FLUX is for hero/marketing/logo/launcher art and style exploration.
The two reinforce each other: author SVGs → rasterize → use the PNGs as FLUX reference
images so generated variants stay on-style.

## License

MIT © Matthew Cohen
