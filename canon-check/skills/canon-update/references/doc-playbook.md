# Per-document playbook

What belongs where, and how to edit each cornerstone document surgically.
The dividing principle: **CLAUDE.md is instructions to an agent, design.md
is the design language itself, AGENTS.md is role/workflow contracts.** A
ruling usually lands in exactly one of them, with at most a one-line
cross-reference from the others.

## CLAUDE.md (root or scoped)

- Holds *operational* design rules an agent must follow while working:
  "use tokens from `tokens.json`, never hardcode hex," "base spacing unit
  is 8px," "components follow `<Thing><Variant>` naming."
- Keep design content in one clearly-headed section (add a `## Design
  Standards` section if none exists) rather than scattering rules through
  unrelated instructions.
- Do not move non-design instructions around, reformat the file, or
  "improve" prose outside the approved sections. CLAUDE.md is the user's
  voice to every future session; edits outside scope are the exact kind of
  silent canon-setting this plugin exists to catch.
- If the repo has scoped CLAUDE.md files (subdirectories), put a rule at
  the narrowest scope that covers it.

## design.md / DESIGN.md

- Holds the design language itself: palette with named roles, type scale,
  spacing system, radius/elevation, motion values, and — importantly —
  the *why* behind the direction, in a sentence or two per area. The "why"
  is what lets a future reader (human or agent) extrapolate to cases the
  doc doesn't enumerate.
- This is the natural home for ratified single-mention canon: a rule that
  previously lived only in an old review artifact gets a real entry here,
  with its origin noted if useful ("adopted from the 2026-03 critic-layer
  review").
- If it doesn't exist and the interview produced real design rulings,
  propose creating it with only the sections the rulings actually fill —
  an empty-template design.md is noise, not canon.

## AGENTS.md

- Holds agent roles, workflow contracts, and review gates. Design content
  belongs here only when it's about *process*: "visual changes get checked
  against design.md," "the design-review agent runs before merge."
- Don't duplicate the design values themselves here — reference design.md
  so there's exactly one place a value can go stale.

## Style guides / README design sections

- If a dedicated style guide exists, treat it like design.md (it may *be*
  the design.md under another name — don't create a competing file).
- README design sections are usually outward-facing summaries. Update them
  last, and only to stop them contradicting the realigned canon — they
  shouldn't become a third copy of the token list.

## Token / config files (tokens.json, tailwind.config, :root CSS vars)

- These are executable canon: editing them restyles the product. Only
  touch them when the user explicitly opted in during Phase 2, and repeat
  the warning at the moment of the edit.
- When a doc ruling and a token value disagree after the interview (user
  ratified the *new* value that only exists in components), the honest
  order is: update the doc to name the intended value, flag the token file
  as now knowingly stale, and let the user decide whether the code change
  happens in this session or as its own task.

## Stale prior artifacts (old briefs, old reviews)

- These get whatever disposition the user ruled in the interview — there's
  no blanket "never delete" rule, but each option has a right shape:
  - **Supersede** (default when the artifact has historical value): leave
    the file, prepend a one-line "superseded by design.md <date>" note,
    and make sure the superseding rule actually exists in a live doc.
  - **Update**: only when the artifact is itself a live doc under another
    name (a "brief" that's really the de-facto style guide). Usually the
    better move is promoting its live content into design.md and then
    superseding or deleting the original — two copies of a rule is how
    drift starts.
  - **Delete**: for fully-implemented, fully-overtaken artifacts. Route
    through cut-weight's quarantine when installed, else move to
    `_canon-check/<date>/retired/`; never hard-delete directly. Grep for
    inbound references first.
- Never *rewrite* a historical artifact to say something new — that
  falsifies the record. New direction goes in live docs.

## Edit mechanics (all documents)

- Prefer targeted Edit operations over full-file rewrites; the diff should
  read as "design sections changed," nothing else.
- Preserve the file's existing heading style, list style, and tone.
- LF endings in this marketplace's repos; check `.gitattributes` elsewhere.
- After all edits, `git diff --stat` (when in a git repo) is the
  verification of record: every touched file should be explainable by an
  approved plan item.
