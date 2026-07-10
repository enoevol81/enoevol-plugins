---
name: canon-update
description: >-
  The second half of Canon Check: after a canon audit reveals where a repo's
  design decisions actually stand, this skill interactively realigns the
  durable documents — CLAUDE.md, design.md/DESIGN.md, AGENTS.md, style
  guides, token files, and whatever cornerstone documents shape direction in
  that repo — so they describe where the product is headed instead of where
  it was when those files were first written. Use this whenever the user
  wants to update, refresh, realign, or rewrite their design docs or project
  instructions after a design-direction shift; whenever they say things like
  "our docs are stale," "CLAUDE.md still says the old style," "make the docs
  match what we're doing now," "formalize the new direction," or "resolve
  the conflicts from the canon report"; and whenever a canon-check audit
  just finished and the user accepts the offer to update. Never run it as a
  silent batch rewrite — the whole skill is an interview-then-approve loop.
---

# Canon Update

## Why this exists

An audit that only *shows* you stale canon leaves the actual problem in
place: every future session still reads the old CLAUDE.md, the old
design.md, the old token file — and quietly steers work back toward a
direction the team has already moved past. The resistance the user feels
("why does everything keep coming out looking like the old style?") lives
in those documents. Updating them is how the new direction stops being a
per-conversation correction and becomes the default.

But these files are load-bearing precisely *because* agents obey them,
which is why this can never be a silent batch rewrite. The user's intent
for where the product is headed is the input; the skill's job is to
translate that intent into precise document edits, get each one approved,
and leave a record of what changed and why.

## Prerequisite: a current Canon Report

This skill works from the gap between documented canon and intended
direction — so it needs both sides.

1. Look for `_canon-check/<date>/canon-report.md`. Use the most recent one
   if it postdates the significant recent work; if it's stale or missing,
   run the **canon-check** audit first (tell the user that's happening and
   why — the update is only as good as the picture of the status quo).
2. Read the report with special attention to the **Conflicts** and
   **Fragile / Single-Mention Canon** sections — those are the items most
   likely to need a ruling, not just a rewrite.

## Phase 1 — Direction interview

Do not guess where the product is headed. Interview the user, grounded in
the report's actual findings rather than abstract questions. Good prompts
are specific and decision-shaped:

- *"The report shows the accent color is `#3B82F6` in the token file but
  three newer components use `#6366F1`. Which one is the direction — or is
  the shift itself the new rule?"*
- *"Corner radius conflicts between 6px and 8px. Pick one, or is the
  radius scale itself changing?"*
- *"This 8px icon-padding rule only exists in a critic-layer brief from
  March. Formalize it, or drop it?"*

Structure the interview around three buckets, derived from the report:

- **Ratify** — implicit or single-mention canon the user wants to keep.
  It gets written into the docs explicitly so it stops being fragile.
- **Retire** — documented rules the direction has moved past. They get
  removed or rewritten, and the report notes why.
- **Rule** — open conflicts that need a decision before any doc can be
  honest. Every conflict in the report should leave this phase with an
  answer or an explicit "leave unresolved, note it as open."

Then walk the report's **Document Relevance** table: every document the
audit judged stale or obsolete gets its proposed disposition settled here —
keep, update, supersede with a note, or delete. Group these by proposed
disposition so the user can approve batches rather than ruling one file at
a time.

Use AskUserQuestion when available (its multiple-choice shape fits
per-finding rulings well); otherwise ask in plain conversation. Batch
related findings — don't make the user answer twenty sequential
one-liners when five grouped questions cover it.

Also ask the one open-ended question the report can't answer: *"Beyond
what the audit found, is there a direction shift the docs should capture —
something you've been correcting by hand every session?"* That question is
frequently where the real payload is.

## Phase 2 — Propose per-document changes

Identify the cornerstone documents that actually exist in this repo — do
not create the full canonical set by default. Typical candidates:
`CLAUDE.md` (root and scoped), `design.md`/`DESIGN.md`, `AGENTS.md`,
style guides, README design sections, and token/config files whose values
the user just ruled on. If a document the user clearly needs doesn't exist
(they made design rulings but there's no design doc to hold them),
propose creating it — as a proposal, not a fait accompli.

For each document, present a concise change plan before touching it:
what sections change, what gets added, what gets removed, and which
interview ruling each change traces back to. `references/doc-playbook.md`
has per-document guidance — what belongs in CLAUDE.md vs design.md vs
AGENTS.md, and how to edit surgically instead of regenerating whole files.

Get approval per document. The user may approve some, reject some, and
amend others — that's the loop working, not friction to route around.

## Phase 3 — Apply and verify

- Edit surgically: change the design-relevant sections, leave everything
  else byte-identical. A doc realignment that rewrites the user's prose
  style or reorganizes unrelated sections has failed even if the design
  content is right.
- Respect repo conventions (this marketplace pins LF endings; other repos
  have their own rules — check before writing).
- If token/config files are in scope, remember they have downstream
  consumers: changing `tokens.json` restyles the product, not just the
  docs. Call that out explicitly and confirm before touching executable
  canon — the default scope of this skill is the *documents*, with code
  value changes as an explicitly opted-into extra.
- **Deletions go through a safety net, not straight to `rm`.** For each
  document the user ruled "delete": if the **cut-weight** plugin is
  installed, route the deletion through its quarantine loop
  (`_quarantine/<date>/`, with its decision gate and rollback) — that
  machinery exists precisely for removing repo artifacts reversibly. If
  cut-weight isn't available, move the file to `_canon-check/<date>/
  retired/` rather than deleting outright, and say so — the user can empty
  that folder once they're confident nothing referenced the file. Either
  way, before removing any document, Grep for references to it (links in
  other docs, paths in configs) and surface what would break.
- After applying, verify: re-read each changed section, confirm the edits
  match the approved plan, and confirm nothing outside the approved
  sections changed (`git diff` is the honest check when available).

## Phase 4 — Close the loop

Write `_canon-check/<date>/update-log.md`: each ruling made in the
interview, each document changed (with the git diff summary), anything
deliberately left unresolved, and anything the user declined. This makes
the *next* audit meaningful — it can distinguish "drift since the last
alignment" from "never aligned at all."

Then tell the user the one-line truth of what just happened: which
documents now carry the new direction, and what — if anything — is still
open.

## What this skill is not

- **Not a batch rewrite.** No document changes without its plan being
  approved. No "I went ahead and updated everything."
- **Not a design generator.** It records direction the user already has;
  it doesn't invent a design language and write it into canon.
- **Not a code restyle.** Token/config value changes are opt-in extras
  with an explicit warning; the core deliverable is aligned documents.
- **Not a general repo cleaner.** It only handles documents the canon
  audit surfaced. Broad dead-file cleanup is **cut-weight**'s job — and
  when both are installed, canon-update's approved deletions ride
  cut-weight's quarantine machinery rather than reimplementing it.
