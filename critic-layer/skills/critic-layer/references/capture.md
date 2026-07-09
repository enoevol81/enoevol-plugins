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
| `.export()` | Returns the manifest object (read this to collect notes). |
| `.setViewport(name)` | Tag notes with a breakpoint after `resize_window`. |
| `.notes` | Live array of raw note objects. |
| `.show()` / `.hide()` | Toggle overlay visibility (hide for a clean "before" shot). |
| `.clear()` / `.destroy()` | Reset notes / remove the overlay entirely. |

**Stay out of picking mode.** Do not synthesize clicks or invent notes during the
live session — it's the human's real-time review.

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

### Re-anchoring

Pins reposition on scroll/resize by resolving `anchor` each frame (id → selector
→ tag+classes → tag+classes+text → first match). Notes survive sticky headers and
lazy loads; heavy route re-renders can orphan a pin (`anchorLive` → false).
