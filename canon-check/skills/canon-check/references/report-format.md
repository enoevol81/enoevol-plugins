# Canon Report format

Write the report to `_canon-check/<date>/canon-report.md` (create the
directory if needed — mirrors the `_quarantine/<date>/` convention used by
the `cut-weight` plugin). Use this section order; omit a category entirely
if genuinely nothing was found for it rather than padding with "no findings."

```markdown
# Canon Report — <repo/project name> — <YYYY-MM-DD>

## Summary
- Sources scanned: <N config/token files>, <N written docs>, <N prior
  design-review artifacts>, <git/session history: yes/no>
- Canonical items found: <N>, across <categories>
- Conflicts flagged: <N>
- Single-mention (fragile) canon: <N>

## Color
| Value | Status | Source(s) | Confidence |
| --- | --- | --- | --- |
| `#1a1a1a` | Primary text | `tokens.json:12`, used in 14 components | Explicit |
| `#3B82F6` | "Accent blue" | `Button.tsx:8` default only | Single-mention |

## Typography
(same table shape — font family, scale, weight)

## Spacing / Layout
(same table shape — base unit, radius, gaps)

## Motion / Interaction
(same table shape, if applicable — transition durations, easing)

## Component Patterns & Naming
(naming conventions, structural patterns treated as standard)

## Conflicts
List every case where two or more sources disagree. This section usually
matters most — lead with it in the chat summary even though it's not first
in the file.

- **Corner radius**: `tailwind.config.js` sets `borderRadius.md: 8px`, but
  `Card.tsx` and `Modal.tsx` both hardcode `6px` and have since the file was
  added. No doc says which is correct.

## Fragile / Single-Mention Canon
Things currently being treated as a rule that were only ever stated once —
worth flagging so the user can decide whether to formalize or abandon them,
rather than continuing to silently defer to an accident.

- **8px icon padding**: appears only in a critic-layer change brief from
  <date>, implemented in `IconButton.tsx`, never mentioned again or added to
  any token file.

## Document Relevance
One row per durable document found — not just what it says, but whether the
document itself is still live. Dispositions are proposals for canon-update
to settle interactively; nothing is changed or deleted by the audit itself.

| Document | Status | Why | Proposed disposition |
| --- | --- | --- | --- |
| `CLAUDE.md` (Design Standards) | Stale | Spacing rule matches build; color section predates the accent shift in 5 components | Update |
| `design/change-brief-2026-03.md` | Obsolete | All 9 items implemented; radius suggestion since reversed | Delete (via cut-weight quarantine if installed) |
| `docs/style-guide.md` | Current | Matches tokens and components | Keep |
```

## Notes on filling it in

- **Cite the actual source** (`file:line` or artifact name + date), not just
  a category label — the whole value of this report is that someone can go
  verify the claim themselves.
- **Don't force every category to have content.** A project with no motion
  system yet doesn't need an empty "Motion" table with a "none found" row —
  just leave the section out.
- **State scan scope explicitly** if you had to bound it (e.g. skipped a
  `vendor/` or `node_modules/` directory, or capped file count) — silent
  truncation defeats the purpose of an audit.
