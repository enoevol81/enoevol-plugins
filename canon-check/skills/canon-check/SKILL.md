---
name: canon-check
description: >-
  Audits a repository's durable artifacts — design tokens and config files,
  CLAUDE.md and style docs, hardcoded component defaults, git/PR/session
  history, and prior design-review or design-planning outputs from other tools
  (critic-layer notes, design briefs, style critiques, swiss-design reviews) —
  to surface design decisions that quietly became permanent canon, including
  ones nobody consciously chose. Produces a Canon Report showing what's locked
  in, where it came from, how confident that lock-in actually is, and where
  sources contradict each other. Use this whenever a designer proposes a
  visual or UI change and needs to know if it conflicts with an existing
  standard, whenever someone asks "why does X always look like this," "what's
  our actual design system," "are we locked into this," "can we change this
  without breaking something," or before any redesign, rebrand, or
  style-guide work — even if the user never says "canon," "audit," or "design
  system" explicitly. Also trigger when handed a past design-review or
  design-plan artifact and the user wants to know whether its one-off
  suggestion has since ossified into an unwritten rule.
---

# Canon Check

## Why this exists

A design language usually isn't declared once at the start of a project — it
accretes. Someone picks a spacing value while building one component. A past
design review says "let's try an 8px radius" and it ships. A config file gets
a hex code as an experiment and nothing ever replaces it. Nobody comes back
later to ask whether any of that was ever meant to be a permanent rule. Months
on, "we always do it this way" just means *whatever's still sitting in the
oldest file* — and the person proposing a change today has no way to know
that without reading every file that came before them.

Canon Check's job is to make that invisible layer visible *before* the next
change gets made, so the user is choosing to follow or break a pattern on
purpose — not drifting into inconsistency, or refusing to change something
that was never actually a rule in the first place.

## Two modes

### 1. Audit — build or refresh the Canon Report

Run this when the user wants the full picture: they ask to audit the design
system, ask "what are we actually locked into," are starting a redesign or
rebrand, or no report exists yet / the last one predates recent work.

1. **Discover sources.** Walk the repo for the categories in
   `references/sources.md` — token/config files, written docs, generated
   design-review artifacts from other tools, code defaults. Don't assume one
   canonical style-guide file exists; the whole premise is that canon is
   scattered and half of it was never written down as a rule.
2. **Run the deterministic pass.**

   ```
   python "${CLAUDE_PLUGIN_ROOT}/skills/canon-check/scripts/scan_tokens.py" <repo-root>
   ```

   (You run from the user's cwd, not the plugin directory — always use
   `${CLAUDE_PLUGIN_ROOT}`, never a bare relative path. If that variable is
   unset, locate the script with Glob for `**/canon-check/scripts/scan_tokens.py`
   under the plugin cache before falling back to manual Greps. Try `python3`
   if `python` isn't on PATH.) The script greps colors, spacing/sizing
   values, and font stacks across the codebase and returns frequency counts
   with file locations. This does the tedious counting so you can spend your
   judgment on what the numbers *mean*, not on manually tallying
   occurrences. Check `scan_complete` in its JSON: if `false`, the scan hit
   its file cap — say so in the report's Scope & limits rather than
   presenting counts as exhaustive.
3. **Read the written sources directly.** CLAUDE.md design sections, style
   guides, and any design-review/design-brief artifacts from other plugins
   need actual reading comprehension, not regex — a design brief might state
   a rule in prose with no token to grep for.
4. **Cross-reference.** For each category, is there one source of truth, or
   do the written docs say one thing while the code actually does another?
   Does a value that shows up in twelve components appear in zero docs
   (implicit canon), or does one doc contradict what's built (drift)?
5. **Assess every document's relevance, not just its contents.** For each
   durable document found — docs, style guides, and especially prior
   design-review artifacts — judge whether the document itself is still
   live: **current** (matches what's built and where things are headed),
   **stale** (partly overtaken; needs updating), or **obsolete** (fully
   superseded; nothing in it is still the direction). Say why in one line,
   and propose a disposition: keep as-is, update, supersede with a note, or
   delete. An old artifact that keeps getting read as a live rule is
   actively harmful, not just clutter.
6. **Write the report** to `_canon-check/<date>/canon-report.md` using the
   exact template in `references/report-format.md`, including the Document
   Relevance section with a proposed disposition per document. The
   non-negotiable rule there: **every finding carries a real citation
   (`file:line`, commit hash, or artifact + date) or gets dropped** —
   hallucinated canon is worse than no report. If the repo has essentially
   no design canon (greenfield), say exactly that in a short report instead
   of inventing findings; if it's a monorepo, attribute findings per app —
   both cases are spelled out in the report format's Edge cases section.
7. **Lead with the headline in chat.** Don't make the user open the file to
   learn the two or three things that actually matter — conflicts especially,
   since those are usually the most useful and most overlooked finding.
8. **Offer the second half.** If the report surfaced conflicts, fragile
   canon, stale documents, or docs that clearly lag where the work has gone,
   end by offering the companion **canon-update** skill: an interactive pass
   that realigns the durable documents (CLAUDE.md, design.md, AGENTS.md,
   style guides) to the current direction and settles each proposed
   disposition — update, supersede, or delete. The audit shows the drag; the
   update removes it. Offer, don't launch — updating canon is the user's
   call.

### 2. Gate — quick consult before a specific change

Run this when a change to something visual/UI is proposed mid-conversation —
"let's round the corners more," "bump the spacing here," "switch the accent
color." You don't need a full re-audit for this:

1. Check for an existing `_canon-check/<date>/canon-report.md`. If one exists
   and covers the relevant category, use it directly.
2. If none exists, or the category in question isn't covered, run a quick
   *targeted* scan — Grep for the specific property/value across the repo
   plus a look at `scan_tokens.py`'s output for that category — rather than
   doing a full audit for a one-line question.
3. Surface what you find in one or two lines before making the edit, e.g.:
   *"Heads up — corner radius is 6px in three places (`tailwind.config.js`,
   `Button.tsx`'s default, and CLAUDE.md's Design Standards section), with no
   documented exception. Changing it here diverges from all three."*
4. **Don't block the change.** The user may well mean to diverge — the point
   is that they're choosing to, with full information, rather than drifting
   into an inconsistency they didn't know existed. If the value only shows
   up once anywhere (single-mention canon), say so too — that's often a sign
   nothing is actually locked in and the change is fine.

## Confidence levels

Not everything that looks like a rule was chosen as one. Rate every finding
using the **operational definitions in `references/report-format.md`** —
they're evidence rules, not adjectives. In brief:

- **Explicit** — declared in an artifact whose purpose is to declare
  standards (tokens file, style guide, CLAUDE.md Design Standards section),
  uncontradicted. A passing mention in prose doesn't qualify.
- **Established by repetition** — no standards artifact, but the same value
  in **3+ independent files** with no competitor in the same role. Canon in
  practice; worth naming explicitly since it's invisible.
- **Single-mention** — exactly one source anywhere: one past design-review
  suggestion, one commit message, one component nobody's touched since. The
  likeliest to be an accident that stuck. Flag as fragile, never as a rule.
- **Conflicting** — two or more sources disagree about the same role (doc
  vs code, component vs component). Usually the single most useful thing
  the report surfaces. Neither side wins by default — the code is what
  ships, the doc is the stated intent; the ruling belongs to canon-update.

When a finding sits between two levels, take the weaker one.

## What counts as a durable document

See `references/sources.md` for the full catalog and how to search each
type. In short: design tokens/config files, written docs (CLAUDE.md, style
guides, README design sections), hardcoded component defaults, git/PR/session
history, and — often the most overlooked category — artifacts already
generated by other design-review or design-planning tools in this ecosystem
(critic-layer change briefs, ux-strategy design briefs/principles, swiss-design
critiques, design-consultation proposals). Those are exactly the "one
suggestion that quietly became permanent" case: written once, acted on, and
never revisited to check if anyone still agrees with it.

## Report format

See `references/report-format.md` for the exact section layout, the per-item
table shape, and a worked example. Every report opens with a summary (source
count, categories covered, number of conflicts) before the category-by-category
detail — that summary is what you should also paraphrase back to the user in
chat.

## Bundled scripts

- `scripts/scan_tokens.py` (invoke via `${CLAUDE_PLUGIN_ROOT}` as shown
  above) — deterministic first pass over the repo. Extracts hex/rgb/hsl
  colors, px/rem/em spacing-like values, and font-family declarations from
  CSS/SCSS/JS/TS/JSON/config files, tallies frequency, and ranks by file
  spread (`file_count`) — the direct input to the "3+ independent files"
  repetition rule. Run it once per audit and reuse its JSON output rather
  than re-deriving frequency counts by hand. It is bounded and honest about
  it: skips binaries and files over `--max-bytes` (1 MB default), stops at
  `--max-files` (5000 default), and reports every skip plus a
  `scan_complete` flag and a greenfield note when nothing is found — it
  never silently drops results. Zero dependencies; works on Windows paths.
