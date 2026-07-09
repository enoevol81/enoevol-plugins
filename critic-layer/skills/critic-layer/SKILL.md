---
name: critic-layer
description: >-
  Run a real-time, in-browser UX/UI design review by placing sticky notes
  directly on a live web page, then turn those notes into an agent-ready change
  brief plus a paste-ready Claude Code prompt. Use this whenever the user wants
  to review, critique, annotate, mark up, or leave feedback on a live website or
  web app — a Framer/Webflow/Shopify/React site, a portfolio, a SaaS landing
  page, a marketing page — and especially when they say things like "review this
  site," "let me mark up the homepage," "leave notes on the hero," "annotate what
  looks wrong," "sticky-note this page," or "turn my design feedback into
  instructions for a coding agent." Also trigger when handed an existing Critic
  Layer / annotation JSON export to synthesize. Trigger even when the user does
  not say "sticky note" or "annotate" — any request to walk a live page and
  capture what should change, or to convert loose visual judgments into precise
  implementation direction, belongs here. This is a review-to-instruction layer,
  not a design editor; it never moves pixels itself and never redesigns the site
  on its own.
compatibility: >-
  Live review needs the claude-in-chrome MCP (drives the user's real Chrome).
  Synthesis-only runs need no browser. Optional: a design.md / DESIGN.md / brand
  notes file to ground the AI's second pass.
---

# Critic Layer

Critic Layer turns a designer's real-time visual judgment into deterministic,
agent-executable design direction. The designer walks a **live page** and drops
**sticky notes directly on the interface** — exactly as they would with Post-its
on a printout. Critic Layer anchors each note to the DOM element under it, then
synthesizes the session into a change brief a human can read and a Claude Code
prompt a coding agent can act on without a round of back-and-forth.

The whole point is to close the gap between *"this section feels wrong"* and a
precise directive like *"increase the hero CTA's height 8–12px, raise its
contrast to the primary brand fill, and add 24px above the CTA row; keep it above
the fold on mobile."* That translation **is** the product.

## What it is not

- **Not a design editor.** It never moves pixels or writes CSS into the page — it
  produces *instructions*. (Live in-browser visual editing is `/impeccable`.)
- **Not an autonomous redesign agent.** The designer's notes are the spec; the AI
  is a *secondary* second set of eyes.
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
full contents). Tell the user: *"Critic Layer is live — click any element to pin
a note, type your comment, pick a category and severity. Place as many as you
like, then tell me when you're done (or say 'next breakpoint')."* **The designer
places notes; you don't.** Stay out of the way.

### Phase 3 — Collect  *(live review only)*
When the user says done, read `JSON.stringify(window.__CRITIC__.export())`, take
one annotated screenshot, and (for multiple breakpoints) resize and repeat. Save
the merged export as `annotation_manifest.json`. Details in `references/capture.md`.

### Phase 4 — AI second pass  *(only if warranted)*
Skip in quiet mode unless you have a high-confidence, grounded issue. In proactive
mode, run the grounded audit in `references/synthesis.md`. Read each note's `x/y`
as element-local; every AI item is `authoredBy: ai`, dismissible, never overriding
a user note.

### Phase 5 — Synthesize
Produce **both** primary artifacts together, kept consistent: the change brief and
the Claude Code prompt (plus `annotation_manifest.json` and, if useful, a priority
table). Exact structures in `references/output.md`.

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

- `scripts/critic-overlay.js` — the injectable sticky-note overlay. Self-
  contained, idempotent, inline DOM inputs only (never `window.prompt`, which
  freezes the browser bridge). Anchors notes to DOM elements and exposes
  `window.__CRITIC__` for read-back.
