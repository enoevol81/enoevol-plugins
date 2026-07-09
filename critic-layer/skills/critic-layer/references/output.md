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

```json
{
  "project": {
    "site_name": "…", "base_url": "https://…", "review_goal": "…",
    "assertiveness": "quiet", "design_intent_source": "PRODUCT.md",
    "created_at": "2026-07-09"
  },
  "captures": [
    { "url": "https://…/", "path": "/", "title": "Homepage", "viewport": "desktop",
      "screenshot": "screenshots/home_desktop.png", "capturedAt": "…",
      "notes": [ /* note objects — see capture.md */ ] }
  ]
}
```

- One `export()` = one capture; collect one per (url, viewport) into `captures`.
  Keep note ids unique (prefix with viewport on collision).
- AI issues use the same note shape with `authoredBy: "ai"` (no `x/y/anchor`
  required), dismissible, never mutating a user note. `uncertain` items also
  surface as an open question.
- `category` ∈ layout|typography|spacing|color|hierarchy|interaction|copy|
  performance|bug|accessibility. `severity` ∈ low|medium|high|blocker.
  `status` ∈ open|resolved|dismissed.
- Preserve the user's `note` text verbatim in the manifest even after rewriting
  it into a directive — the manifest is the source of record.

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
Severity: {…} · Category: {…} · Location: {section / element_label}
Viewport: {…} · Author: {user|ai|uncertain} · Source: {note_001, note_004}

### Problem
{What's wrong, grounded in the note + the element.}

### Direction
{The designer's intent as a clear instruction; for AI issues, your grounded rationale.}

### Suggested implementation
- {concrete delta — px, spacing, contrast direction, breakpoint behavior}

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

### 1. {title} · {severity} · {page} / {viewport}
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

---

## `issue_priority_table.md` (optional)

```md
| # | Issue | Sev | Page | Author | Source |
|---|-------|-----|------|--------|--------|
| 1 | Hero CTA lacks emphasis | high | Home | user | note_001 |
```
