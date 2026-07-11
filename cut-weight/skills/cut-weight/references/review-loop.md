# The review loop: reports and decision gates

Cut-weight is a conversation, not a batch job. The user reads a clear results
file, answers pointed multiple-choice questions about the judgment calls, reads
a plan that reflects those answers, offers last changes, and only then does
anything move. After execution a post-mortem accounts for what happened, and a
final confirmed teardown empties the safety buffer.

Three files are the spine. Write them to the run folder `_quarantine/<date>/`
(create it early -- it holds the reports even before anything is quarantined).
They are real deliverables: write them to disk, then point the user at the
path. Do not just print them into chat.

## Stage 1 -- Findings (`findings.md`)

Produced after Phase 3 classification, before anything moves. The clear results
file. ASCII only.

```
# Cut Weight Findings - <project> - <date>   [mode: <audit|standard|aggressive>]

## True north
<entry points found, and the evidence for each>

## Keep-set
<N files kept; brief breakdown by directory>

## Auto-decided (no question -- the matrix already ruled)
CUT (regenerable, will delete):    <list + bytes each>
QUARANTINE (dead, will move):      <list + one-line evidence each>

## Agent artifacts
Canonical (default: leave as-is):  <list, tracked? each>
Tool/plugin droppings (proposed):  <list + proposed disposition each>

## DECISIONS NEEDED
Group A - <shared pattern, e.g. "dated scratch scripts, unreferenced, >6mo">
  [proposed: X] - options: A / B / C
  1. <path> - <one-line evidence>
  2. <path> - <one-line evidence>
Group B - ...
  3. <path> - ...
Singles
  4. <path> - <one-line evidence> - [proposed: X] - options: A / B / C
...

## Coverage
Analyzed N of M files. <every bound stated -- e.g. git history capped at 500
commits; K files older than that marked age-unknown. No silent caps.>
```

The critical section is **DECISIONS NEEDED**: every questionable item as a
numbered entry with its evidence and a proposed direction, pre-clustered into
the groups the Stage 2 gate will ask about (items sharing an evidence pattern
and proposed disposition group together; item numbers stay global so the user
can split a group by number). This is what the next stage walks through.
Nothing is deleted or moved to produce this file.

In **audit mode this is the final deliverable** -- write it and stop.

## Stage 2 -- Decision gate (interactive, multiple-choice)

Walk the DECISIONS NEEDED list as **groups, not files**. First cluster the
items: everything sharing the same evidence pattern and proposed disposition
is one question ("these 14 dated scratch scripts, all unreferenced and >6mo
old -- quarantine all?"); only genuinely singular items (a large data file, a
doc with unique stakes) get their own question. Then ask each question as a
**multiple-choice** with:

- the file(s) and the one-line evidence (for a group: the shared pattern, the
  count, and the full list by reference to findings.md item numbers),
- 2-4 concrete options, the recommended one first and labeled "(recommended)",
- the standing option to answer freely instead -- which is also how the user
  splits a group ("all except #7").

Where the harness supports structured questions (Claude Code's
AskUserQuestion tool), use it, batching up to 4 questions per call. Hard
rule: **never one prompt per file** -- a 400-candidate repo must land as a
handful of grouped questions, not 400 prompts. If the DECISIONS NEEDED list
still implies more than ~10 questions after grouping, the groups are too
fine; regroup before asking. Do **not** ask about items the matrix already
decided -- CUT artifacts and clearly-dead QUARANTINE are reported, not asked.
Record every answer, including group splits, for the next file.

Options follow the item's type:

| Item | Options (recommended first) |
|---|---|
| ASK candidate (unreachable, ambiguous) | Quarantine / Keep / Delete now |
| Agent canonical file (`CLAUDE.md`, `AGENTS.md`) | Leave as-is / Untrack / Gitignore / Delete |
| Agent tool/plugin dropping | Delete / Untrack / Gitignore / Leave |
| Large or data file | Keep / Quarantine / Delete |
| Doc referencing removed work | Quarantine / Keep / Delete |

## Stage 3 -- Decision report (`decisions.md`)

After the gate, write the resolved plan. ASCII only.

```
# Cut Weight Decisions - <project> - <date>

## Decisions
1. <path> - offered: A / B / C - chosen: <direction> <optional note>
2. ...
<verbatim, so the record is auditable>

## Final action plan
CUT (delete, regenerable):     <list>
QUARANTINE (move to buffer):   <list>
UNTRACK (git rm --cached + ignore): <list>
GITIGNORE (pattern only):      <list>
DELETE (via quarantine):       <list>

## Last call
Review this plan. Reply with any changes before I execute.
```

Fold the user's final suggestions back into the plan before acting. If they
change a decision, update `decisions.md` so it stays the source of truth.

## Stage 4 -- Execute + verify

Now Phases 6-7 of SKILL.md run: confirm the checkpoint, do the cuts, the
quarantine moves, and the untrack/gitignore/delete dispositions -- all per
[quarantine-protocol.md](quarantine-protocol.md) -- then re-run the baseline
and compare. Restore on any regression.

## Stage 5 -- Post-mortem (`postmortem.md`)

The honest accounting, written after verification. ASCII only.

```
# Cut Weight Post-Mortem - <project> - <date>

## Actions taken
CUT (deleted, regenerable):    <list + bytes freed>
QUARANTINED (restorable):      <list> -> _quarantine/<date>/
UNTRACKED:                     <list> (git rm --cached + .gitignore)
GITIGNORED:                    <list>
DELETED (post-quarantine):     <list>

## Verification
Baseline: <what ran, result>   After: <what ran, result>
Reclassified KEEP (turned out load-bearing): <list + why the trace missed it>

## Restore
<exact command(s), with the real SHA, per disposition: quarantine restore
(manifest-driven or revert -- see quarantine-protocol.md for which applies),
untrack undo (git add + ignore-line removal), gitignore undo. No placeholders.>

## Coverage
Analyzed N of M files. <every bound stated; no silent caps>

## Teardown
<buffer deleted? y/n. If git: recovery path. If not: kept, or user-confirmed.>
```

If a step was skipped (no tests exist, user declined git init), say so plainly.
Never claim "verified" for anything that was not run.

## Stage 6 -- Teardown (delete the buffer, on confirmation)

The buffer is a decision aid; once the post-mortem is accepted it can go. This
is the user's "delete everything" -- it removes the quarantined files, **not**
the repo.

- **Ask first, explicitly.** "Delete the quarantine buffer at
  `_quarantine/<date>/`? This removes the staged files."
- **Git repo, quarantine committed (the default):** the files stay
  recoverable from history even after the folder is gone. Delete with
  `git rm -r _quarantine/<date>/` in one commit and record the recovery path
  (`git checkout <quarantine-sha> -- _quarantine/<date>/<path>` then move it
  back per the manifest) in the post-mortem.
- **Git repo, quarantine left untracked (user's choice), or non-git
  project:** deleting the buffer is irreversible -- there is no history to
  fall back on. Warn plainly, require an explicit yes, and default to keeping
  it.
- The CUT deletes (regenerable artifacts) stay done -- a command rebuilds them.
- If the user prefers the 30-day buffer instead of deleting now, that is the
  standing default; teardown is opt-in, not automatic.
