---
name: icon-forge
description: >-
  Point it at any project and it designs a cohesive, native-looking icon set, then
  installs the icons into your live environment. Runs a multi-agent pipeline: detect
  the target platform (Blender add-on, web app/site, VS Code extension, Electron/desktop,
  design system…), research that platform's icon conventions, recon the project's
  function and aesthetic, ingest any inspiration you provide, build an icon-set game
  plan, and emit deterministic SVG/PNG source icons (no fal.ai account needed) plus
  optional FLUX.2 (fal.ai) generation prompts. Finally, use the bundled icon-forge MCP
  server to populate the project with the icons (Blender previews loader, web
  favicon+sprite+manifest, VS Code contributes, etc.). Use this skill WHENEVER the user
  wants icons, an icon pack/set/system, a logo set, favicons, or toolbar/nav/command
  icons for ANY application or project — even if they don't name a platform. Also
  trigger when the user has a project folder/repo and wants its UI to look professional,
  or says "make icons" / "design icons" / "an icon system" / "generate an icon pack".
  This skill spawns subagents (Claude Code Task tool); if subagents are unavailable, run
  the phases inline in sequence.
---

# Icon Forge

Turns **any project** into a coherent, ships-today icon set through a multi-phase agent
pipeline, then **installs the result into the live environment**. You point it at a
project; it figures out what platform you're on, researches that platform's icon rules,
runs research and design agents in parallel, gets ONE approval on the game plan, and
delivers:

1. Deterministic **SVG sources + rasterized PNGs** — the production path for functional
   small UI icons. **This path is complete on its own: no fal.ai account, no API key, no
   image-gen service.**
2. A **one-command install** into the target via the bundled **icon-forge MCP server**.
3. *(Optional)* **FLUX.2 prompts + a fal.ai batch runner** — for hero art, larger
   decorative icons, logos, and style exploration. Only this tier needs a `FAL_KEY`.

## Reality check — read this before promising anything

- **AI image gen (FLUX included) is unreliable for tiny pixel-precise 16–32px UI icons.**
  It won't respect a unit grid or 1px strokes. So the **SVG path is the production path**
  for functional toolbar/nav/command icons. FLUX is for: hero/marketing renders, larger
  app/launcher/splash icons, logos, generating a *style field* to trace, and reference
  imagery. Don't sell FLUX as "it'll output your shippable 32px toolbar icons" — it won't.
- **The two paths reinforce each other.** Author the SVGs first → rasterize → use those
  PNGs as FLUX.2 reference images (or a tiny LoRA training set, ~$0.008/step) so generated
  variants stay on-style.
- **Platform install is raster-or-vector depending on target.** Blender add-on icons load
  as PNG via `bpy.utils.previews`; web prefers SVG (sprite) + PNG favicons; VS Code uses
  SVG. The MCP server handles each correctly.

If the user only wants prompts and waves off the SVG path, fine — but say this once.

## Preflight (check silently; never block the pipeline on these)

- **MCP server** — are the `icon-forge` tools (`list_targets`, `detect_target`,
  `install_icon_set`) available? If not, the usual cause is that the server's Node deps
  were never installed. Tell the user the one-time fix —
  `cd <plugin-dir>/mcp && npm install` (then restart the Claude Code session) — where
  `<plugin-dir>` is this plugin's install root (`${CLAUDE_PLUGIN_ROOT}`, typically under
  `~/.claude/plugins/`). **Do not stall the run**: proceed with the pipeline and use the
  manual install fallback in Phase 6 (`references/environment-install.md`) for this
  session.
- **FLUX tier is optional** — it needs `FAL_KEY` + `pip install fal-client` + network. If
  the user has no fal.ai account or is offline, skip Phase 7 entirely and note it in the
  final summary; the SVG/PNG deliverable is unaffected.
- **Offline works** — everything except FLUX generation and live web verification runs
  offline; the agents fall back to the cached `references/` files.

## Inputs to collect (ask only what's missing, in ONE message — don't over-interview)

1. **Project / target** — a local path, a git repo URL, or (fallback) a description of
   what the app does. The recon agent needs *something* concrete. If you have a path,
   detect the platform with the MCP `detect_target` tool instead of asking.
2. **Platform** — auto-detected from the path; only ask if detection is ambiguous or it's
   description-only. Supported: `blender`, `web`, `vscode-extension`, `electron`, `generic`.
3. **Output directory** — default `./<project-name>-icons/` (don't ask; just say so).
4. **Scope** — full set, or a specific subset (which operators/routes/commands/features).
5. **Inspiration (optional)** — moodboard images, reference icon sets, brand colors, a
   competitor's UI, an adjective list. Feed anything provided into Phase 2 (recon) and
   Phase 4 (art direction). Ask once whether they have inspiration; don't block on it.

If you have a repo/path and an output dir, go.

## Pipeline

**Interruption budget: ONE approval gate, after the game plan (between Phase 4 and
Phase 5).** Everything before it (research/design) and after it (build/install/prompts)
runs without stopping to ask. Only break this if something genuinely blocks (e.g. the
project path doesn't exist).

Order and parallelism: **1 ∥ 2** (independent — spawn together), then **3 ∥ 4** (both
consume the research briefs), then the gate, then **5 ∥ 7** (you build the SVGs while
prompt-smith writes the optional FLUX prompts), then **6** (install).

### How to spawn each agent (Task tool)

Each agent's full brief lives in `agents/`. Subagents do NOT share your context, so for
each one:

1. Read the agent's brief file right before spawning.
2. Spawn a Task whose prompt is: the **full text of the brief**, then a context block
   containing — the target platform, the project path (or description), any inspiration
   the user gave, the **absolute output dir**, and the **full contents** of each upstream
   artifact the brief lists under *Inputs* (paste them in; don't just name the files).
3. **Return contract** (every agent): it writes its output file(s) into the output dir
   and its final message is a ≤10-line summary plus any open questions. If it couldn't
   write files, its final message is the complete artifact — save it to the output dir
   yourself before continuing.

Save every artifact to the output dir as you go so the run is resumable.

### Phase 1 — Platform Icon Standards  → `agents/platform-standards.md`
Researches the **target platform's** current icon conventions (sizes, formats, grid/stroke
rules, color/recolor model, and how icons actually load/register on that platform).
Output: `01-standards-brief.md`.

### Phase 2 — Project Recon  → `agents/project-recon.md`
Inspects the target project: enumerates every UI surface that needs an icon (operators/
panels for Blender; routes/nav/features/favicon for web; commands/views for VS Code; etc.),
reads the brand/aesthetic, and **ingests any inspiration the user provided.**
Output: `02-project-profile.md` (includes the raw **icon inventory** as a table).

### Phase 3 — Icon Strategist (game-plan A)  → `agents/icon-strategist.md`
Consumes briefs 01 + 02. Produces the canonical **icon list**: id, file name, function,
visual metaphor, group, priority (P0 ship-now / P1 / P2). Output: `03-icon-plan.md`.

### Phase 4 — Art Director (game-plan B)  → `agents/art-director.md`
Consumes briefs 01 + 02 (and 03 if available) plus inspiration. Locks the **Style Spec**:
silhouette language, stroke weight, corner/terminal treatment, fill/opacity system, shared
motifs, and a per-icon feasibility pass at the platform's smallest display size.
Output: `04-style-spec.md`.

After 3 + 4: stitch into **`ICON-SET-PLAN.md`** (briefs + final reconciled inventory +
style spec). Art-director feasibility notes win over strategist where they conflict.

### ⛔ THE approval gate (the only one)
Present a compact digest of `ICON-SET-PLAN.md`: icon count by priority, the P0 list with
metaphors, the style spec in one paragraph, and where the install will write. Ask for a
go/adjust. On "go", run Phases 5–7 to completion without further questions.

### Phase 5 — Build the SVG/PNG set (you do this inline — it's the deliverable)
Following `04-style-spec.md` and `01-standards-brief.md`:

1. **Author SVG sources** into `svg/`. One file per P0 icon (and P1 if scope allows).
   Follow `references/platform-icon-spec.md` for the target: one consistent `viewBox`
   across the whole set, grid-aligned, chunky, and — for recolorable platforms like
   Blender — single-colour white-on-transparent with lowered opacity for secondary areas
   (web/VS Code UI icons: `fill="currentColor"`).
2. **Rasterize** to `png/` at the sizes the platform loads:
   `python scripts/rasterize.py svg/ png/ --sizes 32 64 256`
   (web favicon set: `--sizes 16 32 180 192 512 --web` so the conventionally-named copies
   are emitted and the web installer auto-wires them). The script auto-picks a backend
   (cairosvg / resvg / rsvg-convert / Inkscape) and prints install instructions if none
   is present — relay those to the user rather than improvising.

### Phase 6 — Install into the environment (the MCP hookup)
This is what makes the icons land in the real project:

1. `detect_target { projectDir }` — confirm the platform (or honor a user override).
2. `install_icon_set { projectDir, iconsDir, target?, options? }` — copies the icons into
   the platform-native location and writes the loader/manifest:
   - **blender** → PNGs into `icons/` + `icon_forge_icons.py` (a `bpy.utils.previews` loader).
   - **web** → `public/icons/` + `sprite.svg` + `icon-forge-head.html` favicon snippet + `site.webmanifest`.
   - **vscode-extension** → `icons/` + a `contributes` reference snippet.
   - **electron** → `build/icons/` for electron-builder.
   - **generic** → `icons/` + an `icons.index.json`.
3. Report what was written and the next steps the tool returns.

**If the icon-forge MCP tools aren't available** (see Preflight), do the install by hand
this session: follow `references/environment-install.md` → "Manual fallback", using the
`scripts/install/` templates — and remind the user of the one-time `npm install` fix. For
a **live Blender session**, a connected Blender MCP can additionally register the previews
at runtime — but the on-disk loader is the durable path.

### Phase 7 — FLUX prompts (optional)  → `agents/prompt-smith.md`
Skip silently if the user has no fal.ai account / declined the FLUX tier. Otherwise spawn
it right after the gate, in parallel with Phase 5. Consumes `ICON-SET-PLAN.md`. Produces:
- `prompts/flux2-prompts.md` — a locked **style preamble** + one prompt per icon.
- `prompts/generate_fal.py` — batch runner (from the `scripts/generate_fal.py` template).
Running it is the **user's** step (needs `FAL_KEY`); don't run it for them unless asked
and the key is already set.

## Output layout (deliver exactly this; `prompts/` only if Phase 7 ran)

```
<project-name>-icons/
├── ICON-SET-PLAN.md            # the game plan (briefs + inventory + style spec)
├── 01-standards-brief.md
├── 02-project-profile.md
├── 03-icon-plan.md
├── 04-style-spec.md
├── svg/                        # native-style source icons (production path)
├── png/                        # rasterized sizes for the target platform
└── prompts/                    # OPTIONAL FLUX tier
    ├── flux2-prompts.md        # style preamble + per-icon FLUX.2 prompts
    └── generate_fal.py         # fal.ai batch runner (user runs; needs FAL_KEY)
```

(The install step writes into the *target project*, not this output dir.)

End by presenting `ICON-SET-PLAN.md` and the `svg/`+`png/` results first, then the install
report, then the prompts. Give a one-line honest summary of which icons are ship-ready
(P0 SVGs, installed) vs. which are FLUX exploration.

## Running without subagents

If the Task tool isn't available, run each phase yourself in order, writing the same
artifacts. The pipeline is identical; you just lose parallelism.

## Reference files
- `references/platform-icon-spec.md` — per-platform icon construction rules + how icons
  load/install on each target. Read before authoring any SVG or installing.
- `references/environment-install.md` — the install playbook: the icon-forge MCP tools,
  per-target layouts, troubleshooting a missing server, and manual fallbacks. Read before
  Phase 6.
- `references/fal-flux2.md` — current fal.ai FLUX.2 endpoints, params, consistency tactics
  (seed, reference images, LoRA). Read before writing prompts or the runner.
