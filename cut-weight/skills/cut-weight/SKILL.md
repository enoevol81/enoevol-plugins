---
name: cut-weight
description: >-
  Cut dead weight from a repository or project folder by tracing what the code
  actually needs to run. Finds the execution entry points (the "true north"),
  builds the reachable keep-set, then classifies every remaining file by
  evidence (age, git history, name patterns, references) into cut, quarantine,
  or ask -- never a blind delete, everything rollbackable. Use whenever the
  user wants to clean up a repo or folder, find unused or old files, remove
  development artifacts or dead code, trim project bloat, archive abandoned
  experiments, or asks "what can I delete", "what is actually needed to run
  this", "this folder is a mess", "cut the fat" -- even if they never say the
  word cleanup. Also use for audit-only passes where nothing is removed yet.
---

# Cut Weight

## The idea

Every project accumulates development sediment: scratch scripts, abandoned
experiments, `-old` and `-v2` copies, backups, build output, stale planning
docs, tests for deleted features. Judging files one at a time by whether they
"look important" is unreliable -- dead files often look important and
load-bearing files often look disposable.

So invert the question. Start from how the project **runs** and work outward:

1. **True north** -- find the execution entry points: what actually starts,
   gets loaded by a platform, or ships.
2. **Keep-set** -- trace imports and references outward from those entry
   points. Everything reachable is off-limits.
3. **Process of elimination** -- everything else is a candidate. File data
   (age on two clocks, references, name patterns, regenerability) decides its
   fate, not intuition.
4. **Quarantine, don't delete** -- candidates move to a dated quarantine
   folder with a manifest and a checkpoint commit. Only recognizably
   regenerable artifacts are deleted outright. Every action is reversible
   until the user decides otherwise.

## Modes

Confirm the mode from the user's phrasing before acting:

- **audit** -- report only. Nothing moves, nothing is deleted. Use when the
  user says "just tell me", "what can I delete", "don't touch anything yet".
- **standard** (default) -- delete regenerable artifacts, quarantine dead
  candidates, ask about ambiguous ones.
- **aggressive** -- only when the user explicitly says to delete. Even then,
  the checkpoint commit comes first and source files still transit through
  quarantine in a single revertable commit.

## Workflow

### Phase 0 -- Baseline

Safety first; everything later depends on being able to roll back and on
knowing what "working" looked like before you touched anything.

- If the project is a git repo: get to a clean state, then make a checkpoint
  commit (`chore: pre-cut-weight checkpoint`) if there are uncommitted
  changes. If it is not a git repo, offer `git init` + initial commit; if the
  user declines, quarantine becomes the ONLY removal mechanism -- no deletes
  at all, not even artifacts.
- Find out how the project runs and how it is checked (start command, test
  command, build command). Run what exists once and record the result. A red
  baseline is fine -- verification later compares against this baseline, it
  does not demand green.

### Phase 1 -- Find true north

Identify every execution entry point. Read
[references/entry-points.md](references/entry-points.md) for where to look
per ecosystem (Node, Python, static/no-build web, Blender add-ons, Claude
Code plugins, monorepos) and for the tracing rules. Output of this phase: a
short list of entry points, each with the evidence that makes it one.

If you cannot determine how the project runs, stop and ask. Guessing true
north poisons every downstream decision.

### Phase 2 -- Build the keep-set

Run the bundled inventory script for a full picture of the tree (sizes, ages
on both clocks, name signals, artifact dirs):

```
python <skill-path>/scripts/inventory.py <project-root> --out inventory.json
```

Then trace outward from each entry point: static imports, requires, path
literals (`fetch("/api/x")`, `open("data/...")`, script/link tags in HTML),
config files the platform reads. Mark each reached file KEEP with the chain
that reached it. Be conservative: dynamic loading (glob imports, route
auto-discovery, template engines) keeps the whole directory it points at.
When genuinely unsure whether something is reachable, it is KEEP.

### Phase 3 -- Eliminate by evidence

Everything not in the keep-set is a candidate. For each one, gather evidence
and classify -- the signals and their precedence are in
[references/evidence-signals.md](references/evidence-signals.md). Summary
matrix:

| Verdict | Conditions | Action |
|---|---|---|
| KEEP | Reachable from an entry point; or config/data/secrets; or dynamic-load uncertainty | Untouched |
| CUT | Recognizably regenerable (build output, caches, coverage, `__pycache__`, OS droppings) | Delete + add to .gitignore |
| QUARANTINE | Unreachable AND unreferenced AND old on both clocks (mtime and git last-touch) | Move to quarantine with manifest |
| ASK | Unreachable but recently touched; referenced by docs; looks like data; large; or otherwise ambiguous | Present with evidence, user decides |

### Phase 4 -- Act

Follow [references/quarantine-protocol.md](references/quarantine-protocol.md)
exactly: cuts first, then all quarantine moves in one revertable commit with
a manifest and restore instructions. In audit mode, skip this phase entirely.

### Phase 5 -- Verify

Re-run whatever you ran in Phase 0 (start, tests, build) and compare against
the baseline. Any regression: restore the implicated quarantined files,
reclassify them KEEP, and note in the report what turned out to be
load-bearing and why the trace missed it. Do not rationalize a new failure as
pre-existing -- that is what the recorded baseline is for.

### Phase 6 -- Report

Honest accounting, using this shape (ASCII only -- no unicode symbols, they
break Windows consoles):

```
# Cut Weight Report - <project> - <date>

## True north
<entry points found, and the evidence for each>

## Keep-set
<N files kept; brief breakdown by directory>

## Actions
CUT (deleted, regenerable):        <list, with bytes freed>
QUARANTINED (restorable):          <list> -> _quarantine/<date>/
ASK (your call, with evidence):    <list + one-line evidence each>

## Verification
Baseline: <what ran, result>   After: <what ran, result>

## Restore
<exact command(s) to undo everything>

## Coverage
Analyzed N of M files. <Any bound hit, stated explicitly -- e.g. "git
history scanned to 500 commits; 12 files older than that are marked
age-unknown". Never let a cap pass silently.>
```

If a step was skipped (no tests exist, user declined git init), say so
plainly. Never claim "verified" for anything that was not run.

## Common mistakes

- **Trusting names over reachability.** A file named `test-old.js` that
  `server.js` imports is load-bearing. Reachability always outranks naming.
- **Deleting "obviously dead" source files.** Only regenerable artifacts are
  ever deleted. Dead-looking source goes to quarantine -- the whole point is
  that your judgment might be wrong and the cost of wrong should be zero.
- **Missing dynamic loading.** Route auto-discovery, `import(variable)`,
  glob-driven plugin loading, and template engines all reach files no static
  trace will find. When a codebase does this, widen the keep-set to the
  directory level and say so in the report.
- **Treating data like code.** An unreferenced `.json`, `.csv`, `.sqlite`, or
  media file is ASK, never CUT -- code is in git, data often is not.
- **Skipping the baseline.** Without a pre-change checkpoint and a recorded
  test result, you cannot prove the cleanup broke nothing, and you cannot
  cheaply undo it.
