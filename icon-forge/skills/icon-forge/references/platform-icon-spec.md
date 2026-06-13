# Platform Icon Spec (cached reference)

Per-platform construction rules + how icons load/install on each target. Read before
authoring any SVG or running the install. Verify version-sensitive details with a quick
web check if something looks stale.

## Universal construction rules (apply everywhere)

- **Design on a grid.** Snap strokes and rectangles to whole units so they stay crisp when
  scaled down. One strong silhouette per icon.
- **Hold one stroke weight** across the whole set. Pick stroked OR filled and commit.
- **≤2 levels of detail.** Gradients, soft shadows, and fine texture vanish at 16px.
- **Silhouette carries meaning, not color.** The icon must read in pure black-on-white.

---

## Blender (add-on icons)

- **Grid:** built-ins use a 100-unit grid in a 1600×1600 doc (~1400 of art). Practical
  community equivalent: a **20×20 grid with ~4px padding**, art in the inner ~16×16.
- **Stroke:** one grid unit ≈ **1px at a 16px target**; align to whole pixels.
- **Colour model:** **white areas + strokes over transparency**, secondary areas at
  **lowered opacity**. This lets Blender recolor the icon while keeping contrast. Author
  monochrome; encode "shades" as opacity, never as hue.
- **How they load (the real shipping path):** custom add-on icons are **raster PNGs
  registered at runtime via `bpy.utils.previews`** — NOT entries in Blender's built-in SVG
  sheet (that needs a recompile).

```python
import bpy, os
import bpy.utils.previews
_pcoll = None
def register():
    global _pcoll
    _pcoll = bpy.utils.previews.new()
    icons_dir = os.path.join(os.path.dirname(__file__), "icons")
    _pcoll.load("PANEL_PROJECT", os.path.join(icons_dir, "panel_project.png"), 'IMAGE')
def unregister():
    bpy.utils.previews.remove(_pcoll)
# use:  layout.operator("mytool.x", icon_value=_pcoll["PANEL_PROJECT"].icon_id)
```

- **Sizes:** author SVG → rasterize to PNG with alpha. Ship **32**; add **64**/**256** for
  hi-DPI. Custom preview icons display baked pixels (they do NOT auto-recolor to theme), so
  bake at a neutral/light value, or ship light + dark variants.

---

## Web (app / site)

- **UI icons → SVG sprite.** Author SVGs with `fill="currentColor"` (or `stroke`), bundle
  into one `sprite.svg` of `<symbol id="ID" viewBox="…">`, and reference with
  `<svg><use href="/icons/sprite.svg#ID"/></svg>`. Recolor via CSS `color`.
- **Favicons → PNG set + manifest.** Ship `favicon-16.png`, `favicon-32.png`,
  `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, plus a `favicon.svg` if you
  want a vector tab icon. Wire with `<link rel="icon">` / `<link rel="apple-touch-icon">` /
  `<link rel="manifest">`. **Name the PNGs exactly as above** so the icon-forge web
  installer auto-wires them.
- **Maskable PWA icon:** keep critical art inside the inner 80% safe zone.
- Rasterize for web with: `python scripts/rasterize.py svg/ png/ --sizes 16 32 180 192 512`.

---

## VS Code extension

- **Command / view icons → SVG**, referenced from `package.json` `contributes` with
  `light`/`dark` variants, e.g. `"icon": { "light": "icons/x.svg", "dark": "icons/x.svg" }`.
  Author monochrome so both themes work; 16×16 design target.
- **Product/file icon themes** use an **icon font** (heavier; only if building a full
  theme). For most extensions, plain per-command SVGs are right.

---

## Electron / desktop

- **App icon:** the builder (electron-builder) wants a high-res master (512 or 1024 PNG)
  and produces `.ico` (Windows) / `.icns` (macOS). Point the build config at `build/icons/`.
- **Tray icon:** small (16–32px) monochrome-ish PNG; macOS template images recolor.
- **In-window UI:** it's a web app — use the Web rules above.

---

## Generic

Document the assumed convention, drop the icons into `icons/` with an index, and keep the
construction universal (grid-aligned, one stroke weight, simple silhouette).

## Do / don't (all platforms)

- DO align to the grid; DO hold one stroke weight; DO use opacity (not hue) for secondary
  detail on recolorable platforms.
- DON'T add gradients, soft shadows, or >2 levels of detail.
- DON'T rely on color to disambiguate icons.
