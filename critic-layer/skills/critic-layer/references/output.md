# Output: manifest schema + brief/prompt templates

Read this with `synthesis.md` for the synthesis phase. Critic Layer emits **two
tightly-linked primary artifacts** plus supporting files:

- `ux_ui_change_brief.md` (primary, human)
- `implementation_prompt.md` (primary, agent)
- `annotation_manifest.json` (record of raw notes)
- `issue_priority_table.md` (optional quick-scan)

The brief and the prompt must describe the **same changes in the same priority
order** — a human reads the brief, an agent runs the prompt, they never disagree.

---

## `annotation_manifest.json`

The overlay export, optionally merged across breakpoints and enriched with AI
issues. Save it so a future round-trip pass can diff resolved vs unresolved.

**This file is a contract, not a scratch file.** Downstream tools — notably the
`canon-check` plugin, which consumes Critic Layer manifests as prior
design-review artifacts — key on `schemaVersion`, field names, and the enums
below. Changes at version 1 must be additive; anything breaking bumps
`schemaVersion`.

```json
{
  "schemaVersion": 1,
  "tool": "critic-layer",
  "project": {
    "site_name": "…", "base_url": "https://…", "review_goal": "…",
    "assertiveness": "quiet", "design_intent_source": "PRODUCT.md",
    "created_at": "2026-07-09"
  },
  "captures": [
    { "url": "https://…/", "path": "/", "title": "Homepage", "viewport": "desktop",
      "viewportSize": { "width": 1440, "height": 1200 },
      "screenshot": "screenshots/home_desktop.png", "capturedAt": "…",
      "notes":    [ /* note objects    — see capture.md */ ],
      "drawings": [ /* drawing objects — see capture.md */ ],
      "edits":    [ /* edit objects    — see capture.md */ ] }
  ]
}
```

- One `export()` = one capture; collect one per (url, viewport) into `captures`, carrying the export's fields through (`viewportSize`, `capturedAt`, …). Keep ids unique across merges (prefix with viewport on collision).
- **Notes** are intent. **Drawings** localize/emphasize (their `bbox` + the screenshot say *where*; fold a labeled drawing in like a note, an unlabeled one as visual support for a nearby note/edit). **Edits** are the highest-fidelity input: each carries an exact `changes` diff the designer authored live — translate those into tasks with the concrete values **verbatim**, don't re-derive or soften them. An edit with a `text` change is a copy directive; a `style` change is a precise value directive (`font-size 34px→40px`); an `html` change is a structural directive.
- AI issues use the note shape with `authoredBy: "ai"` (no `x/y/anchor` required), dismissible, never mutating a user note/drawing/edit. `uncertain` items also surface as an open question.
- `category` ∈ layout|typography|spacing|color|hierarchy|interaction|copy| performance|bug|accessibility. `severity` ∈ low|medium|high|blocker. `status` ∈ open|resolved|dismissed. `effort` ∈ S|M|L (optional, added at synthesis — see `synthesis.md`).
- Preserve the user's raw input verbatim — `note` text, drawing `label`, and edit `changes`/`before`/`after` — even after rewriting into a directive. The manifest is the source of record.

---

## `ux_ui_change_brief.md`

```md
# UX/UI Change Brief — {Site name}

## Site
{base_url} · reviewed {date} · breakpoints: {desktop, mobile, …}
Assertiveness: {quiet|proactive} · Design intent: {source or "verbal"}

## Review scope
- {page} ({viewports})

## Priority summary
1. {one-line issue, highest impact} — {user|ai}

---

# Page: {Homepage}

## Issue {n}: {short title}
Severity: {…} · Effort: {S|M|L} · Category: {…} · Location: {section / element_label}
Viewport: {…} · Author: {user|ai|uncertain} · Source: {note_001, note_004}

### Problem
{What's wrong, grounded in the note + the element.}

### Direction
{The designer's intent as a clear instruction; for AI issues, your grounded rationale.}

### Suggested implementation
- {concrete delta — px, spacing, contrast direction, breakpoint behavior}

### Acceptance check
{Observable end state — same check the implementation prompt uses.}

---

## Cross-page issues
{CTA drift, spacing rhythm, type-scale inconsistencies spanning pages.}

## Open questions
- {Ambiguous/uncertain item, phrased as a question for the designer.}
```

Rules: preserve the designer's wording; be specific (no "make it better"); group
and dedupe; attribute every issue; rank by impact.

---

## `implementation_prompt.md`

A self-contained prompt a coding agent runs with zero back-and-forth — same
issues, same order, as executable tasks.

```md
You are implementing a UX/UI change brief for {site}. Make only the changes
below. Do not redesign anything not listed. Respect the existing design system
({tokens/framework}); do not invent new tokens. Work in priority order.

## Design system / constraints
{accent, font stack, spacing scale, radius — from the intent file, or "infer from
the codebase and confirm before diverging".}

## Tasks (priority order)

### 1. {title} · {severity} · effort {S|M|L} · {page} / {viewport}
Target: {element_label / anchor.selector as a hint}
Change: {precise directive}
Details:
- {concrete step}
Acceptance: {observable end state — e.g. "primary CTA is the highest-contrast
element in the hero; ≥24px above the CTA row; above the fold at 390px".}
Source note: {note_001}

## Do not
- Do not touch {out-of-scope areas}.
- Do not act on the Open Questions — surface them back to the designer.
```

Use each note's `anchor.selector` as a starting hint for locating the element in
source — pair it with `element_label` + note text, since build tooling can mangle
selectors.

**Captured edits → near-complete tasks.** When an issue comes from an `edit`, its
`changes` already give you the exact target values — write the task with them
verbatim and make `Change:` the concrete diff (e.g. "set `font-size` 34px → 40px,
`color` → `rgb(0,0,255)`"), `Target:` its `selector`/`element_label`, and
`Acceptance:` the after-state. The designer already proved the change on the page;
your job is to point the agent at the source, not to re-decide the value. Flag
only translation caveats (a raw `rgb()`/`px` that should map to a design token —
say which token, don't silently swap).

---

## `issue_priority_table.md` (optional)

```md
| # | Issue | Sev | Effort | Page | Author | Source |
|---|-------|-----|--------|------|--------|--------|
| 1 | Hero CTA lacks emphasis | high | S | Home | user | note_001 |
```
