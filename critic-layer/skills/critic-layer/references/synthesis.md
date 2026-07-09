# Synthesis: reading notes, assertiveness, prioritization

Read this for the synthesis phase (turning notes into the brief). Together with
`output.md` it's all you need for a synthesis-only run.

## Position is a pointer, not decoration

A note's `x`/`y` are element-local, normalized 0-1 inside the anchored element.
Use them to find the *sub-part* the designer meant:

- `y ≈ 0.05` on a card → the card's top edge / header, not the whole card.
- `x ≈ 0.9` on a nav → the right cluster (CTA / account), not the logo.
- centered (`≈0.5`) → the element as a whole.

"Too tight" pinned at the top of a section means the spacing *above* it, not its
internal padding, unless the point sits between children.

## Attribution discipline (a trust requirement, not a style choice)

Every issue is tagged by author, and the reader must always be able to tell what
the designer said from what you inferred. If the two blur, the brief is useless.

- **`user`** — the designer's judgment. Preserve their intent and wording; convert
  to a concrete directive but never replace it with a different opinion. Disagree?
  Add a separate `uncertain` item — don't overwrite theirs.
- **`ai`** — your inference. Clearly labeled, dismissible, secondary. Sorts below
  equal-severity user issues.
- **`uncertain`** — you can't tell what they meant, or you're not confident.
  Surface as an open question; don't guess a directive.

## From note to directive

For each user note produce: **Problem** (what's wrong, grounded in note +
element) → **Direction** (their intent as an instruction) → **Suggested
implementation** (concrete deltas: px, spacing, contrast direction, breakpoint
behavior). Ranges are fine when flagged: "increase button height ~8-12px (to
~48px) — verify against the type scale." Never "make it better" / "polish this" —
if you can't make it concrete, it's an open question.

## Cross-note reasoning

- **Group** related notes (three CTA notes → one "CTA consistency" issue).
- **Dedupe** the same complaint pinned twice.
- **Detect cross-page drift**: separate notes about the same component on
  different pages → name the inconsistency as its own, higher-priority issue.
- **Separate** subjective preference ("I'd prefer serif") from objective
  usability/accessibility problems (contrast below AA, 32px tap target). Mark
  which is which; prioritize the objective ones.

## Assertiveness modes (chosen per run)

The designer's notes are always the spine. What varies is how much of *your own*
judgment you add.

- **quiet** (default): synthesize the user's notes — that's the job. Add an AI
  issue only when high-confidence AND grounded in the design intent (e.g. a
  contrast ratio below AA, a literal overflow). Don't pad: a five-note review
  yields a five-issue brief plus any genuine grouping/cross-page findings.
- **proactive**: also run the grounded audit below and surface extras as
  labeled, dismissible suggestions. Still secondary — never reorder or override
  user notes; AI issues sort below equal-severity user issues.

Read the mode from the user ("just my notes"/"quiet" → quiet; "your take
too"/"what else" → proactive) or a `user_goal`/intent file. When unsure, default
quiet and offer to go proactive.

## Grounding gate (any AI issue, both modes)

You may assert an AI issue only after ingesting design intent — a
`design.md`/`DESIGN.md`/brand notes/`PRODUCT.md`, or a one-line verbal statement
of what the experience is for. Without it, an AI critique is ungrounded noise; ask
for one sentence of intent first. Deviations from a *stated* design system
outrank your own aesthetic preferences.

## Grounded audit checklist (proactive)

Report a hit only with concrete evidence in the rendered page:

- **Hierarchy** — is the primary action the most prominent thing? Competing CTAs?
- **Spacing** — inconsistent section rhythm; cramped mobile padding.
- **Type scale** — >3-4 sizes in play; weak contrast between levels.
- **Contrast** — text/CTA below WCAG AA against its actual backdrop.
- **CTA consistency** — same action styled differently across pages.
- **Responsive** — overflow, clipped content, sub-44px tap targets, bad mobile
  headline breaks.
- **Alignment** — elements that should share an edge but don't.

Anything you can't tie to visible evidence is at most an open question.

## Prioritization

1. Blockers / bugs (broken, unusable, inaccessible).
2. Hierarchy & clarity. 3. Conversion (primary action weak/buried).
4. Usability & responsiveness. 5. Accessibility (elevate to top if blocker-level).
6. Consistency (cross-page drift). 7. Polish (subjective refinement).

Within a tier, user-authored issues rank above AI-inferred ones.
