# canon-check

A two-part design-canon workflow. **canon-check** audits a repository's
durable artifacts — design tokens, config files, CLAUDE.md and style docs,
hardcoded component defaults, git/session history, and prior design-review
or design-planning outputs from other tools — to surface design decisions
that quietly became permanent canon, including ones nobody consciously
chose. **canon-update** is the follow-up: an interactive pass that realigns
the cornerstone documents to where the product is actually headed.

Most design language isn't declared once at the start of a project — it
accretes. A spacing value gets picked while building one component. A past
design review says "let's try an 8px radius" and it ships. A config file
gets a hex code as an experiment and nothing ever replaces it. Nobody comes
back later to check whether any of that was ever meant to be a rule. Canon
Check makes that invisible layer visible before the next change gets made,
so a designer is choosing to follow or break a pattern on purpose.

## The workflow

- **Audit** (`canon-check`) — full scan across all durable sources, writes
  a Canon Report (`_canon-check/<date>/canon-report.md`) with categories
  (color, type, spacing, motion, component patterns), confidence per
  finding, and a dedicated conflicts section. Ends by offering the update.
- **Gate** (`canon-check`) — a quick, targeted consult run inline whenever
  a specific visual/UI change is proposed, so the user knows if it diverges
  from something already locked in before making the edit. It never blocks
  the change — it just makes sure drift is chosen, not accidental.
- **Update** (`canon-update`) — interview-then-approve realignment of the
  durable documents. Findings from the report get sorted into **Ratify**
  (formalize implicit canon), **Retire** (remove rules the direction moved
  past), and **Rule** (decide open conflicts); every stale or obsolete
  document gets its disposition settled (keep / update / supersede /
  delete); each affected document (CLAUDE.md, design.md, AGENTS.md, style
  guides) gets a per-document change plan approved before anything is
  edited, and a `_canon-check/<date>/update-log.md` records every ruling.
  Token/config file changes (executable canon) are opt-in only.

## Works with cut-weight

The audit assesses every durable document's relevance (current / stale /
obsolete) and proposes a disposition. When the user rules "delete,"
canon-update doesn't hard-delete: if the **cut-weight** plugin is installed
it routes the removal through cut-weight's quarantine loop (reversible,
gated); otherwise it moves the file to `_canon-check/<date>/retired/`. The
two plugins stay separate because they answer different questions —
cut-weight asks "is this file needed to run?", canon-check asks "is this
document still true?" — but they hand off cleanly where they meet.

## Confidence levels

Every finding is rated by evidence rules, not adjectives: **Explicit**
(declared in a standards artifact — tokens file, style guide, CLAUDE.md
Design Standards), **Established by repetition** (no doc, but the same
value in 3+ independent files), **Single-mention** (exactly one source
anywhere — possibly an accident that stuck), or **Conflicting** (sources
disagree — usually the most useful thing the report surfaces). And every
finding must carry a real citation (`file:line`, commit, or artifact +
date) — anything the auditor can't cite gets dropped, never guessed.

## Bundled script

`skills/canon-check/scripts/scan_tokens.py` — a zero-dependency,
cross-platform Python script that greps colors, spacing values, and font
stacks across the repo and tallies frequency with file locations, ranked
by file spread, so the tedious counting doesn't have to be done by eye.
The scan is bounded (file-size and file-count caps) and reports every
skip plus a `scan_complete` flag — it never silently truncates. The skill
invokes it via `${CLAUDE_PLUGIN_ROOT}`; by hand:

```
python "<plugin-root>/skills/canon-check/scripts/scan_tokens.py" <repo-root>
```

## Install

```
/plugin marketplace add enoevol81/enoevol-plugins
/plugin install canon-check@enoevol-plugins
```
