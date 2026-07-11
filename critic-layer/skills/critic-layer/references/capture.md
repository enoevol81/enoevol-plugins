# Capture & overlay (live browser)

Read this ONLY for a live review session (Phases 1-3). A synthesis-only run
(you were handed an existing `annotation_manifest.json`) does not need this file.

Critic Layer drives the user's **real Chrome** through the claude-in-chrome MCP.
No server, no headless daemon: the overlay lives in the page and the skill reads
it back through `javascript_tool`.

## 1. Load tools (one ToolSearch call)

```
ToolSearch: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__resize_window
```

## 2. Tabs & viewports

- Call `tabs_context_mcp` first; never reuse a prior session's tab id. Open the
  target in a **new tab** unless the user names an existing one.
- Resize with `resize_window` between breakpoint passes:

  | name | width | height |  | name | width | height |
  |------|-------|--------|--|------|-------|--------|
  | desktop | 1440 | 1200 |  | mobile | 390 | 844 |
  | tablet | 768 | 1024 |  | | | |

- After each resize, tag the overlay: `window.__CRITIC__.setViewport('mobile')`.

## 3. Inject the overlay

Read `scripts/critic-overlay.js` and pass its **entire contents** to
`javascript_tool`. It's an idempotent IIFE (re-inject re-shows, never
duplicates). Re-inject after any full navigation.

## 4. Read notes back

```js
JSON.stringify(window.__CRITIC__.export())
```

Do this when the user says they're done with a breakpoint. Take one `computer`
screenshot of the annotated page for the record.

## 5. Dialogs — hard rule

Never trigger `alert`/`confirm`/`prompt` or click page controls that open native
dialogs — a modal **freezes the browser bridge**. The overlay uses inline DOM
inputs for exactly this reason. If a page throws a dialog, tell the user to
dismiss it manually.

## 6. CSP fallback

If injection fails (no `window.__CRITIC__` after the call, strict CSP), fall back
to screenshot + conversational marking: capture with `computer`, describe regions
by coordinate/section, record notes into the same manifest schema. Say plainly
that live pins are unavailable on this page and why.

---

## Overlay API (`window.__CRITIC__`)

The designer drives the on-page HUD and pins; you only read and configure.

| Call | Purpose |
|------|---------|
| `.export()` | Returns the manifest object — `{notes, drawings, edits, counts, …}`. |
| `.setViewport(name)` | Tag notes/drawings/edits with a breakpoint after `resize_window`. |
| `.setMode(name)` | `'pick'` / `'draw'` / `'edit'` / `'off'`. The designer normally drives this from the HUD; only call it if they ask. |
| `.notes` / `.drawings` / `.edits` | Live arrays of raw captured objects. |
| `.show()` / `.hide()` | Toggle overlay visibility (hide for a clean "before" shot). |
| `.clear()` / `.destroy()` | Reset all captures / remove the overlay entirely. Note: `.clear()` wipes note/drawing/edit *records* but does not roll back live DOM edits already applied — reload the page for that. |

**Stay out of the designer's way.** Do not synthesize clicks, invent notes, or
make edits during the live session — Pick/Draw/Edit are the human's real-time
review. You only read and (if asked) `setViewport` / `setMode`.

### Three capture types in `export()`

`notes` are the sticky notes (unchanged, schema below). `drawings` are vector
markup. `edits` are live element edits with an exact diff. All carry `viewport`
so multi-breakpoint merges stay separable, and `id`s are unique per capture.

### The note object

```json
{
  "id": "note_001", "url": "/", "viewport": "desktop",
  "x": 0.42, "y": 0.31, "pageX": 611, "pageY": 388,
  "anchor": { "tag": "button", "id": "", "classes": ["cta","cta--primary"],
              "text": "Get started", "selector": "section.hero > div > button.cta.cta--primary" },
  "element_label": "button.cta.cta--primary",
  "category": "hierarchy", "severity": "medium",
  "note": "CTA feels buried against the hero background.",
  "desired_change": "Make this the obvious next action.",
  "authoredBy": "user", "status": "open", "anchorLive": true
}
```

- **`x`/`y`** — element-local, normalized 0-1 (which *part* of the element). Read
  them per the position rubric in `synthesis.md`, not as page pixels.
- **`pageX`/`pageY`** — absolute document px, fallback anchor.
- **`anchor`** — identity for re-finding the element on re-render: prefer
  `selector`; `id` is decisive; `text`+`classes` disambiguate repeated components.
- **`anchorLive`** (on export) — `true` if the element was re-found. If `false`,
  location is approximate; lean on `element_label` + note text.

### The drawing object

```json
{
  "id": "draw_001", "tool": "ellipse", "color": "#ff5b45", "width": 3,
  "label": "make this bigger", "viewport": "desktop", "url": "/",
  "points": [[612, 470], [180, 540]],
  "bbox": { "x": 60, "y": 470, "w": 120, "h": 70 }
}
```

- **`tool`** — `pen` (freehand: `points` is the full polyline) · `line` / `arrow`
  (`points` = [start, end]) · `rect` / `ellipse` (`points` = [corner, corner]).
- **`points`** — absolute **page** coordinates `[pageX, pageY]` (scroll-independent),
  so a drawing stays glued to content. `bbox` is the page-space bounding box —
  use it to say *which region/element* the markup sits over (intersect with element
  rects, or eyeball against the screenshot).
- **`label`** — optional text the designer typed for that mark; treat like a note.
- A drawing has no DOM anchor: localize it by `bbox` + the annotated screenshot.

### The edit object (live edit + captured diff)

```json
{
  "id": "edit_001", "element_label": "div.hero-card-title",
  "selector": "div.hero-card:nth-of-type(1) > div.hero-card-title",
  "anchor": { "tag": "div", "id": "", "classes": ["hero-card-title"], "text": "…", "selector": "…" },
  "anchorLive": true, "viewport": "desktop", "url": "/", "authoredBy": "user",
  "changes": [
    { "kind": "style", "prop": "font-size", "from": "34px", "to": "40px" },
    { "kind": "style", "prop": "color", "from": "rgb(17,17,17)", "to": "rgb(0,0,255)" },
    { "kind": "text", "from": "Old copy", "to": "New copy" },
    { "kind": "attr", "prop": "href", "from": "/old", "to": "/new" }
  ],
  "before": { "html": "…", "text": "…", "style": {…}, "attrs": {…} },
  "after":  { "html": "…", "text": "…", "style": {…}, "attrs": {…} }
}
```

- **`changes`** is the payload: an exact, minimal list of what the designer set.
  `kind` ∈ `text` | `style` | `attr` | `html`. Style props report **computed**
  `from`/`to` (readable, e.g. `rgb(...)`, `px`) but are only listed when the
  designer actually authored that inline property — no cascade noise.
- **`before`/`after`** are full snapshots for context/round-tripping; `changes` is
  what you turn into a directive. Prefer `changes` verbatim — it's the highest-
  fidelity signal Critic Layer produces.
- The edit is **already applied to the live DOM** (visible in the screenshot);
  your job at synthesis is to hand the coding agent the same diff to apply to
  source. Anchor the target with `selector` + `element_label` + `anchor`.

### Re-anchoring

Pins/edits reposition on scroll/resize by resolving `anchor` each frame (id →
selector → tag+classes → tag+classes+text → first match). Notes survive sticky
headers and lazy loads; heavy route re-renders can orphan a pin (`anchorLive` →
false). Drawings reposition by page coordinates, independent of the DOM.
