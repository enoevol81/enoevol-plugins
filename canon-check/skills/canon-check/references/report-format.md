# Canon Report format

Write the report to `_canon-check/<date>/canon-report.md` (create the
directory if needed — mirrors the `_quarantine/<date>/` convention used by
the `cut-weight` plugin). Use this section order; omit a category entirely
if genuinely nothing was found for it rather than padding with "no findings."

## The one hard rule: cite or drop

Every finding must carry a citation a reader can go verify: a `file:line`
(or `file` plus the exact value), a commit hash, or an artifact filename +
date. **If you cannot cite where a finding lives, delete the finding** — do
not soften it to "appears to," do not keep it as a hunch. A canon report
with one invented entry poisons trust in every real one. The scan JSON and
your own Reads/Greps are the only admissible evidence; general knowledge of
"what design systems usually do" is not.

## Template

```markdown
# Canon Report — <repo/project name> — <YYYY-MM-DD>

## Summary
- Sources scanned: <N config/token files>, <N written docs>, <N prior
  design-review artifacts>, <git history: full / shallow / unavailable>
- Canonical items found: <N>, across <categories>
- Conflicts flagged: <N>
- Single-mention (fragile) canon: <N>
- Scope & limits: <anything bounded or skipped — scan file cap hit,
  directories excluded, git history shallow, monorepo apps treated
  separately. Write "none" if the scan was complete.>

## Color
| Value | Role / decision | Lives in | First appeared | Confidence |
| --- | --- | --- | --- | --- |
| `#1a1a1a` | Primary text | `tokens.json:12`; 14 components (scan: file_count 14) | `a1b2c3d` 2025-11-02 "add base palette" | Explicit |
| `#3B82F6` | "Accent blue" | `Button.tsx:8` default only | untraced (predates history) | Single-mention |

## Typography
(same five columns — font family, scale, weight)

## Spacing / Layout
(same five columns — base unit, radius, gaps)

## Motion / Interaction
(same five columns, if applicable — transition durations, easing)

## Component Patterns & Naming
(same five columns; "Value" is the pattern, e.g. `<Thing><Variant>` naming)

## Conflicts
One entry per case where two or more sources disagree. This section usually
matters most — lead with it in the chat summary even though it's not first
in the file. For each conflict name **both sides with citations**, and say
which side is currently winning in practice (what actually ships):

- **Corner radius** — doc vs code. `tailwind.config.js:14` sets
  `borderRadius.md: 8px`; `Card.tsx:22` and `Modal.tsx:9` hardcode `6px`.
  In practice 6px ships (2 components vs 0 uses of the token). Neither side
  wins by default: the code is the shipped reality, the doc is the stated
  intent — resolution is a canon-update ruling, not the audit's call.

## Fragile / Single-Mention Canon
Things currently treated as a rule that were only ever stated once — flag
so the user can formalize or abandon them on purpose:

- **8px icon padding** — only source: critic-layer `ux_ui_change_brief.md`
  (2026-03-14), implemented in `IconButton.tsx:31`, never mentioned again
  or added to any token file.

## Document Relevance
One row per durable document found — not just what it says, but whether the
document itself is still live. Dispositions are proposals for canon-update
to settle interactively; nothing is changed or deleted by the audit itself.

| Document | Status | Why | Proposed disposition |
| --- | --- | --- | --- |
| `CLAUDE.md` (Design Standards) | Stale | Spacing rule matches build; color section predates the accent shift in 5 components | Update |
| `design/ux_ui_change_brief.md` | Obsolete | All 9 items implemented; radius suggestion since reversed | Delete (via cut-weight quarantine if installed) |
| `docs/style-guide.md` | Current | Matches tokens and components | Keep |
```

## Per-finding fields, defined

- **Value** — the literal token/value/pattern, verbatim.
- **Role / decision** — what it's being used *as*, in the repo's own words
  when a doc names it, otherwise your inference marked as such
  ("(inferred) primary CTA color").
- **Lives in** — every place it's load-bearing, cited. Use the scan JSON's
  `file_count` for spread; list the top files, not all fourteen.
- **First appeared** — earliest evidence you can actually produce:
  a commit (`git log -S"<value>" --oneline --reverse` — first hit), a dated
  artifact, or a doc. If history is shallow/unavailable, write
  `untraced (shallow history)` — never guess a date.
- **Confidence** — one of the four levels below, applied by the evidence
  rules, not by feel.

## Confidence levels — operational definitions

Assign by rule; when a finding sits between two levels, take the weaker one.

- **Explicit** — the value appears in an artifact whose *purpose* is to
  declare standards (a tokens/theme file, a style guide, a CLAUDE.md
  "Design Standards" section) **and** nothing contradicts it. Prose that
  merely mentions a value in passing is not Explicit.
- **Established by repetition** — no standards artifact declares it, but it
  appears in **3 or more independent files** (scan `file_count >= 3`;
  copies of one component don't count as independent) with no competing
  value in the same role. Changing it in one place would create visible
  inconsistency — that's canon in practice.
- **Single-mention** — exactly **one** source anywhere: one file, one old
  brief, one commit message. Most likely to be an accident that stuck.
  Flag as fragile, never present as a hard rule.
- **Conflicting** — two or more sources disagree about the same role
  (doc vs code, or component vs component). Always also gets a Conflicts
  entry. A value that differs *between monorepo apps with separate design
  surfaces* is not automatically Conflicting — see below.

## Edge cases

- **Greenfield / no canon found.** If the scan and doc pass turn up
  essentially nothing, the report is still written and still useful — it
  is the baseline. Keep it short: Summary with real zeros, a line "No
  design canon found — greenfield. First deliberate choices will become
  canon; consider starting a tokens file or design.md," and the Document
  Relevance table for whatever docs do exist. Do **not** pad empty
  categories or invent 'implied' canon to have something to say.
- **Monorepo.** If the repo contains multiple apps/packages with distinct
  design surfaces (check `apps/`, `packages/`, workspace configs), say so
  in Scope & limits and attribute each finding to its app
  (`apps/web: …`). The same role having different values in different apps
  is a *scoping question* ("is there one design system or several?") —
  report it once under Conflicts phrased that way, not as N separate
  conflicts. Shared-package values used by all apps are repo-wide canon.
- **Docs contradict code.** Report as Conflicting, cite both sides, state
  which side ships in practice, and leave the ruling to canon-update. The
  audit never declares a winner.
- **Git history shallow or absent.** Detect with
  `git rev-parse --is-shallow-repository` (or the failure of any `git log`).
  Record it in the Summary's Sources line, write `untraced` in
  First-appeared cells you can't back with a real commit, and never
  present "oldest commit in the shallow window" as the origin of a value.

## Notes on filling it in

- **Don't force every category to have content.** A project with no motion
  system doesn't need an empty "Motion" table — leave the section out.
- **State scan scope explicitly** whenever it was bounded (the scan JSON's
  `scan_complete: false`, skipped directories, capped file lists) — silent
  truncation defeats the purpose of an audit.
- The Summary block is what canon-update reads first, and the Conflicts,
  Fragile, and Document Relevance sections are its working input — keep
  their shapes exactly as templated so the handoff stays mechanical.
