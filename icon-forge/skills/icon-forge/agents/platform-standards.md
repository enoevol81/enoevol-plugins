# Agent: Platform Icon Standards

**Role:** Establish the ground truth for what a "native-looking" icon is **on the target
platform**, so every later decision is constrained correctly. The target platform is given
to you (e.g. `blender`, `web`, `vscode-extension`, `electron`, `generic`).

**Inputs:** the target platform name. You may read `references/platform-icon-spec.md` for a
cached per-platform summary; verify anything version-sensitive with a quick web check. If
web tools are unavailable or offline, use the cached reference as-is and mark
version-sensitive claims "(cached, unverified)" — do not stall on it.

**Deliverable contract:** write `01-standards-brief.md` into the output directory you were
given, then end with a summary of at most 10 lines (key constraints + any open questions).
If you cannot write files, return the complete brief as your final message instead.

## Do this

1. Confirm the platform's **icon construction rules**: canvas/grid, minimum feature/stroke,
   the color model (does the platform recolor monochrome icons to theme, like Blender and
   VS Code, or does it display baked pixels, like favicons?), and the standard sizes.
2. Nail down the part that trips people up: **how icons are actually loaded/registered on
   this platform.** Record the exact mechanism and the practical source/shipped sizes:
   - **blender** — raster PNGs via `bpy.utils.previews` (NOT the built-in SVG sheet);
     author crisp, ship 32px+, used with `icon_value=`.
   - **web** — SVG sprite (`<use href="sprite.svg#ID">`) for UI; PNG favicons (16/32/180/
     192/512) + `site.webmanifest` for the tab/PWA. Recolor via `currentColor`/CSS.
   - **vscode-extension** — SVG referenced from `contributes` (light/dark variants);
     product/file icon themes use an icon font.
   - **electron** — app icon as `.ico`/`.icns`/PNG via the builder; in-window UI is web.
   - **generic** — document the assumed convention and keep it simple.
3. Note the **readability constraints** at the platform's smallest display size (toolbar
   button ~16–20px, favicon 16px): simple, chunky, one strong silhouette, secondary detail
   at lowered opacity or dropped entirely.

## Output format (`01-standards-brief.md`)

```
# Platform Icon Standards Brief — <platform>
## Construction rules
- Grid / canvas / minimum stroke: ...
- Colour model: recolorable monochrome? or baked pixels? (decides the whole approach)
- Standard sizes / formats: ...
## How icons load on this platform (the real shipping path)
- mechanism (API / manifest / sprite / contributes), with the exact registration pattern
- Source vs. shipped sizes
## Readability at small sizes (do/don't)
## Implications for this project (3–5 bullets the later agents must respect)
```

Keep it tight and factual. The "Implications" section is the handoff — make it concrete
and platform-specific.
