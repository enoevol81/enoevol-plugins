---
name: critic-layer
description: >-
  Run a real-time, in-browser UX/UI design review on a live web page in three
  modes — pin sticky NOTES on elements, DRAW freehand markup/arrows/shapes over
  the page, and make live ELEMENT EDITS (text/style/attributes/HTML) that are
  captured as exact before→after diffs — then turn all of it into an agent-ready
  change brief plus a paste-ready Claude Code prompt. Use this whenever the user
  wants to review, critique, annotate, mark up, draw on, or directly edit a live
  website or web app — a Framer/Webflow/Shopify/React site, a portfolio, a SaaS
  landing page, a marketing page — and especially when they say things like
  "review this site," "mark up the homepage," "leave notes on the hero," "draw on
  the page," "circle what's wrong," "just change the copy/color/spacing right
  here," "show me the fix on the page," or "turn my design feedback into
  instructions for a coding agent." Also trigger when handed an existing Critic
  Layer / annotation JSON export to synthesize. Trigger even when the user does
  not say "sticky note" or "annotate" — any request to walk a live page and
  capture what should change, whether by note, drawing, or a direct edit, or to
  convert loose visual judgments into precise implementation direction, belongs
  here. Live edits mutate the page for WYSIWYG feedback but the coding agent still
  applies the captured change to source; Critic Layer is not an autonomous
  redesign agent.
compatibility: >-
  Live review needs the claude-in-chrome MCP (drives the user's real Chrome);
  without it, a manual paste-into-DevTools path still works. Synthesis-only runs
  need no browser. Optional: a design.md / DESIGN.md / brand notes file to
  ground the AI's second pass.
---

# Critic Layer

Critic Layer turns a designer's real-time visual judgment into deterministic,
agent-executable design direction. The designer walks a **live page** and marks
it up three ways, all from one on-page HUD:

- **Pick** — drop **sticky notes** on any element, exactly like Post-its on a
  printout. Each note anchors to the DOM element under it.
- **Draw** — **freehand / arrow / shape markup** over the page (circle the thing,
  point an arrow, box a region), captured as vector strokes with optional labels.
- **Edit** — **live-edit an element** (text, style, attributes, or full HTML). The
  change applies to the page immediately (WYSIWYG) *and* is recorded as an exact
  before→after diff.

Critic Layer then synthesizes the session into a change brief a human can read and
a Claude Code prompt a coding agent can act on without a round of back-and-forth.

The whole point is to close the gap between *"this section feels wrong"* and a
precise directive like *"increase the hero CTA's height 8–12px, raise its
contrast to the primary brand fill, and add 24px above the CTA row; keep it above
the fold on mobile."* A note states the intent; a drawing points at it; a live
edit nails the exact target value. That translation **is** the product.

## What it is / is not

- **It captures direction, in three fidelities.** A note is the loosest ("this
  feels buried"); a drawing localizes it; a live edit is the most precise (the
  designer sets the actual value and Critic Layer records the diff). Higher
  fidelity = less ambiguity for the coding agent.
- **Live edits are WYSIWYG-on-the-page, but not the ship.** Edit mode mutates the
  live DOM so the designer sees the fix, and captures the before→after diff — but
  the *coding agent* still applies that change to source. Critic Layer is not the
  thing that ships final pixels. (For a full free-form in-browser visual editing
  session, `/impeccable` is still the deeper tool.)
- **Not an autonomous redesign agent.** The designer's notes, drawings, and edits
  are the spec; the AI is a *secondary* second set of eyes.
- **Not a crawler.** Capture only the pages/breakpoints the user names.

## Two entry points

1. **Live review** (default): open a page, inject the overlay, the designer pins
   notes, you synthesize. Do all phases below.
2. **Synthesis-only**: the user hands you an existing `annotation_manifest.json`
   (the browser session already happened). **Skip Phases 1–3**, jump to Phase 4.
   You do **not** need `references/capture.md` for this path.

## The AI's role is deliberately secondary

The designer's notes are the source of truth. The AI's jobs, in order: (1)
faithfully synthesize the user's notes — preserving intent and wording — into
clear, grouped, prioritized direction; (2) *only then*, and only once grounded,
offer its own observations as clearly-labeled, dismissible suggestions.

The AI earns the right to opine by first ingesting the design intent — a
`design.md`/`DESIGN.md`, brand notes, or a one-line statement of what the
experience is for. Ungrounded critique is noise. Assertiveness is per run:
**quiet** (default; synthesize notes, add AI issues only when high-confidence and
grounded) vs **proactive** (also run a grounded audit, surfaced as suggestions).
Every issue is attributed **`user` / `ai` / `uncertain`** — never blurred. Full
rules in `references/synthesis.md`.

## Workflow

### Phase 0 — Ground yourself
Look for design intent in the working dir (`design.md`, `DESIGN.md`,
`design-system.md`, `brand*.md`, `PRODUCT.md`, a `user_goal` note) and read it.
Note the assertiveness mode (default quiet). Confirm the review scope — URL,
pages, breakpoints. Capture only those.

### Phase 1 — Open the live page  *(live review only)*
Follow `references/capture.md`: load the claude-in-chrome tools, `tabs_context_mcp`
first, open the target in a new tab, set the first breakpoint.

### Phase 2 — Inject the overlay  *(live review only)*
Inject `scripts/critic-overlay.js` via `javascript_tool` (read the file, pass its
full contents). Tell the user: *"Critic Layer is live. Use the HUD top-right to
switch modes: **Pick** to pin notes on elements, **Draw** to sketch/arrow/circle
markup, **Edit** to change an element's text, style, or HTML directly (the page
updates live and I capture the exact change). Mark it up however you like, then
tell me when you're done (or say 'next breakpoint')."* **The designer drives all
three modes; you don't.** Stay out of the way.

### Phase 3 — Collect  *(live review only)*
When the user says done, read `JSON.stringify(window.__CRITIC__.export())`, take one annotated screenshot, and (for multiple breakpoints) resize and repeat. Save the merged export as `annotation_manifest.json`. **Collect before any navigation or reload** — a full page load wipes the overlay's notes — and quietly re-collect every ~10 notes on long reviews. Details in `references/capture.md`.

### Phase 4 — AI second pass  *(only if warranted)*
Skip in quiet mode unless you have a high-confidence, grounded issue. In proactive
mode, run the grounded audit in `references/synthesis.md`. Read each note's `x/y`
as element-local; every AI item is `authoredBy: ai`, dismissible, never overriding
a user note.

### Phase 5 — Synthesize
Produce **both** primary artifacts together, kept consistent: the change brief and
the Claude Code prompt (plus `annotation_manifest.json` and, if useful, a priority
table). Fold **all three** capture types in: notes are intent, drawings localize
it, and **edits carry an exact before→after diff** — treat a captured edit as the
highest-fidelity directive (use its concrete values verbatim; the agent applies
the diff to source). Exact structures in `references/output.md`.

## Failure modes — name them, route around them

- **claude-in-chrome MCP not connected** (ToolSearch finds no
  `claude-in-chrome` tools, or `tabs_context_mcp` errors): say so, then offer
  (a) the **manual path** — the user pastes `scripts/critic-overlay.js` into
  DevTools Console themselves, reviews, clicks the HUD's **Export** button, and
  pastes the JSON back to you (continue at Phase 4) — or (b) synthesis-only.
  Never pretend a live session happened.
- **Injection blocked (CSP / sandboxed frame)**: no `window.__CRITIC__` after
  injecting → offer the manual DevTools paste (console evaluation sidesteps page
  CSP), else the screenshot fallback in `references/capture.md`.
- **Navigation wipes notes**: a full page load destroys the overlay. Collect the
  export at the end of every page/breakpoint and before any navigation. If the
  MCP loses the tab, the user's notes are still recoverable via the HUD Export
  button or `window.__CRITIC__.dump()` in DevTools.
- **Page behind auth**: it's the user's real Chrome, so their session applies —
  have them log in themselves first. Never ask for or type credentials.

## Output rules (the output is the product)

- **Preserve the designer's intent and wording** — quote or tightly paraphrase;
  never swap in your own opinion.
- **Be specific and implementable** — concrete deltas (px, spacing, contrast/fill
  direction, breakpoints). No "make it better." Unknown exact value → defensible
  range, flagged.
- **Group and dedupe**; call out cross-page inconsistencies as their own issues.
- **Separate** subjective preference from clear usability/accessibility problems.
- **Attribute every issue** (`user`/`ai`/`uncertain`) and cite its source note id.
- **Prioritize by impact**; within a tier, user issues outrank AI issues.
- **Surface unclear notes** as open questions rather than guessing.

## Reference files (read only what the phase needs)

- `references/capture.md` — **live review only**: claude-in-chrome setup, tabs,
  viewports, overlay injection/read-back, the `window.__CRITIC__` API, note
  object, re-anchoring, CSP fallback. *Skip for synthesis-only runs.*
- `references/synthesis.md` — reading note positions, attribution, assertiveness
  modes, grounded audit, prioritization.
- `references/output.md` — the manifest schema and the brief / prompt / priority
  table templates.

A synthesis-only run needs just `synthesis.md` + `output.md`.

## Bundled scripts

- `scripts/critic-overlay.js` — the injectable review + markup + live-edit overlay. Self-contained, idempotent, inline DOM inputs only (never `window.prompt`, which freezes the browser bridge). Three HUD modes (Pick / Draw / Edit); anchors notes and edits to DOM elements, stores drawings as page-space vectors, and exposes `window.__CRITIC__` for read-back. Its versioned export (`schemaVersion: 1`) is reachable via the API and the HUD **Export** button (clipboard + console), so notes survive a lost MCP bridge.
