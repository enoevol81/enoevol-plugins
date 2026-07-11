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

Delivery is a **review loop**, never a silent batch: a clear findings file, a
multiple-choice decision gate on the judgment calls, a plan the user signs off,
execution, a post-mortem, and a final confirmed teardown of the buffer. The
stages and file shapes live in
[references/review-loop.md](references/review-loop.md).

## Modes

Confirm the mode from the user's phrasing before acting:

- **audit** -- stop after the findings file (Phase 4). Nothing moves, nothing
  is deleted, no decision gate. Use when the user says "just tell me", "what can
  I delete", "don't touch anything yet".
- **standard** (default) -- the full review loop: findings file, multiple-choice
  decision gate, decision report, execute, post-mortem, confirmed teardown.
  Delete regenerable artifacts, quarantine dead candidates, let the user rule on
  the ambiguous ones.
- **aggressive** -- only when the user explicitly says to delete. Even then, the
  checkpoint commit comes first, source files still transit quarantine in a
  single revertable commit, and the decision gate still runs for anything
  genuinely ambiguous.

## Hard safety rules (every mode, no exceptions)

- **Nothing is deleted, moved, or untracked before the user approves the plan**
  at the Phase 4-5 gate. Phases 0-5 are read-only apart from the checkpoint
  commit and writing the report files.
- **Protected paths are never candidates**, whatever the evidence says:
  `.git/`, `_quarantine/` (every run, including old ones), the run's own
  reports (`findings.md`, `decisions.md`, `postmortem.md`, `inventory.json`),
  and anything the user marked keep in this or a prior gate. inventory.py
  refuses to walk the first two; you enforce the rest.
- **Quarantine over delete.** Direct deletion is reserved for regenerable
  artifacts whose rebuild command exists; everything else transits quarantine.
- **Every action ships with its exact undo command** (real SHAs, real paths)
  in the post-mortem -- see
  [references/quarantine-protocol.md](references/quarantine-protocol.md).

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

Create the run folder `_quarantine/<date>/` now -- it holds the inventory and
every report, even if nothing is ever quarantined. Then run the bundled
inventory script for a full picture of the tree (sizes, ages on both clocks,
name signals, artifact dirs, agent artifacts, unreadable paths):

```
python "${CLAUDE_PLUGIN_ROOT}/skills/cut-weight/scripts/inventory.py" <project-root> --out _quarantine/<date>/inventory.json
```

`${CLAUDE_PLUGIN_ROOT}` is set when this skill runs as an installed plugin --
never invoke the script by a bare relative path, because the session's cwd is
the user's project, not the skill folder. If the variable is unset, locate
`inventory.py` under this skill's own directory first. Use `python` on
Windows, `python3` where `python` is Python 2 or missing; the script is
stdlib-only. Check the summary it prints: a `[CAPPED]` or `unreadable` line
means partial coverage -- carry that into the findings file's Coverage
section.

Then trace outward from each entry point: static imports, requires, path
literals (`fetch("/api/x")`, `open("data/...")`, script/link tags in HTML),
config files the platform reads. Mark each reached file KEEP with the chain
that reached it. Be conservative: dynamic loading (glob imports, route
auto-discovery, template engines) keeps the whole directory it points at.
When genuinely unsure whether something is reachable, it is KEEP.

### Phase 2.5 -- Agent-artifact gate

AI tooling (Claude Code, Cursor, Aider, and installed/third-party plugins)
leaves files the reachability trace never covers and the age heuristics
mis-handle: canonical instruction files (`CLAUDE.md`, `AGENTS.md`, `.claude/`)
and tool droppings (transcripts, caches, plugin state, agent scratch). These
get their own disposition gate -- never the cut/quarantine matrix. Read
[references/agent-artifacts.md](references/agent-artifacts.md) for the taxonomy
and rules.

inventory.py tags what it detects (the `agent_artifacts` summary in the JSON).
Do not prompt here. Instead assign each item a **proposed** disposition from the
four-way set -- **leave as-is / untrack** (`git rm --cached` + gitignore)
**/ gitignore / delete** -- and route it into the consolidated decision gate in
Phase 4 (canonical files -> "Agent artifacts", proposed leave-as-is; tool/plugin
droppings -> the sanitize group). Canonical files are never touched without an
explicit choice. Remove these from the Phase 3 candidate pool so they are not
processed twice.

### Phase 3 -- Eliminate by evidence

Everything not in the keep-set -- and not already handled by the agent-artifact
gate -- is a candidate. For each one, gather evidence and classify -- the signals and their precedence are in
[references/evidence-signals.md](references/evidence-signals.md). Summary
matrix:

| Verdict | Conditions | Action |
|---|---|---|
| KEEP | Reachable from an entry point; or config/data/secrets; or dynamic-load uncertainty | Untouched |
| CUT | Recognizably regenerable (build output, caches, coverage, `__pycache__`, OS droppings) | Delete + add to .gitignore |
| QUARANTINE | Unreachable AND unreferenced AND old on both clocks (mtime and git last-touch) | Move to quarantine with manifest |
| ASK | Unreachable but recently touched; referenced by docs; looks like data; large; or otherwise ambiguous | Route to the Phase 4 decision gate |

ASK is not a verdict you resolve alone -- every ASK item becomes a numbered
entry in the findings file's DECISIONS NEEDED list and is settled by the user in
Phase 4.

The rest of the workflow is a report-driven review loop: a clear findings file,
a multiple-choice decision gate, a plan the user signs off, execution, a
post-mortem, and a confirmed teardown. The stages and the exact file shapes are
in [references/review-loop.md](references/review-loop.md) -- follow it exactly.
The reports live in the run folder created in Phase 2.

### Phase 4 -- Findings + decision gate

Write `_quarantine/<date>/findings.md` (Stage 1 shape): true north, keep-set,
auto-decided CUT/QUARANTINE, agent artifacts, and the numbered **DECISIONS
NEEDED** list. In **audit mode this is the final deliverable -- stop here.**

Otherwise run the decision gate (Stage 2): walk DECISIONS NEEDED as
**multiple-choice questions** -- use the structured multiple-choice prompt
(AskUserQuestion) when available, recommended option first. Batch by group,
never one prompt per file: items sharing the same evidence pattern and
proposed disposition are one question ("these 14 dated scratch scripts --
quarantine all?"), with a free-text answer always available to split a group.
Do not ask about matrix-decided items. Record every answer.

### Phase 5 -- Decision report

Write `_quarantine/<date>/decisions.md` (Stage 3 shape): each decision verbatim,
then the resolved **Final action plan** (CUT / QUARANTINE / UNTRACK / GITIGNORE /
DELETE), then a **Last call** for changes. Fold any final suggestions back into
the plan -- and the file -- before touching anything.

### Phase 6 -- Act

Follow [references/quarantine-protocol.md](references/quarantine-protocol.md)
exactly: cuts first, then quarantine moves and untrack/gitignore/delete
dispositions in one revertable commit with a manifest. Execute the plan the user
approved in Phase 5, nothing more.

### Phase 7 -- Verify

Re-run whatever you ran in Phase 0 (start, tests, build) and compare against the
baseline. Any regression: restore the implicated files, reclassify them KEEP,
and record what turned out to be load-bearing and why the trace missed it. Do
not rationalize a new failure as pre-existing -- that is what the recorded
baseline is for.

### Phase 8 -- Post-mortem + teardown

Write `_quarantine/<date>/postmortem.md` (Stage 5 shape): actions actually
taken, verification (baseline vs after), anything reclassified KEEP, restore
commands with real SHAs, and coverage. If a step was skipped, say so plainly;
never claim "verified" for a check that did not run.

Then the teardown (Stage 6) -- the user's "delete everything": **ask explicitly**
before removing the buffer. In a git repo the committed quarantine keeps files
recoverable after deletion; in a non-git project deleting the buffer is
irreversible, so warn and default to keeping it.

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
- **Cutting generated-but-required files.** Lockfiles, database migrations,
  test snapshots, and committed codegen look machine-made but are inputs the
  project cannot rebuild identically -- they are KEEP, never CUT. See the
  regenerability section of
  [references/evidence-signals.md](references/evidence-signals.md).
- **Killing files that run remotely or are read by tools, not code.** CI
  workflows, `dependabot.yml`, hosting configs (`netlify.toml`, `vercel.json`,
  `Procfile`), and toolchain dotfiles (`.editorconfig`, `.nvmrc`, linter
  configs) have zero in-repo references by design. Platform-consumed = KEEP.
- **Blind-quarantining Claude/agent files.** `CLAUDE.md`, `AGENTS.md`, and
  `.claude/` config are not dead weight to trace or age out -- they are
  workspace conventions with their own gate (leave / untrack / gitignore /
  delete). A freshly written `CLAUDE.md` is not "recently touched, keep by
  accident"; ask what the user wants done with it. See Phase 2.5.
- **Skipping the baseline.** Without a pre-change checkpoint and a recorded
  test result, you cannot prove the cleanup broke nothing, and you cannot
  cheaply undo it.
