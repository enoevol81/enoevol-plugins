# cut-weight

Cut dead weight from a repository by tracing what the code actually needs to run —
never by guessing which files "look important."

## The method

1. **True north** — find the execution entry points: what starts, what the platform
   loads, what CI and deploy run.
2. **Keep-set** — trace imports and references outward from those entry points.
   Everything reachable is off-limits.
3. **Process of elimination** — everything else is a candidate, judged by file
   evidence: age on two clocks (mtime + git last-touch), reference search, name
   patterns, regenerability.
4. **Quarantine, don't delete** — candidates move to a dated `_quarantine/` folder
   with a manifest, in a single revertable commit. Only recognizably regenerable
   artifacts (build output, caches, coverage) are deleted outright. Data files are
   never auto-removed.

Three modes: **audit** (findings file only), **standard** (default), **aggressive**
(explicit delete requests — still checkpointed and revertable).

### The review loop

Cleanup runs as a report-driven conversation, not a silent batch:

1. **Findings** (`findings.md`) — a clear results file: keep-set, auto-decided
   cuts, and a numbered **decisions-needed** list. In audit mode this is the final
   deliverable.
2. **Decision gate** — multiple-choice questions (recommended option first) on each
   questionable item; your answers are recorded.
3. **Decision report** (`decisions.md`) — the resolved action plan, ending with a
   last call for changes.
4. **Execute + verify** against the recorded baseline.
5. **Post-mortem** (`postmortem.md`) — what actually happened, restore commands,
   coverage.
6. **Teardown** — on your explicit confirmation, delete the quarantine buffer
   ("delete everything"); git-recoverable in a repo, a hard warning if not.

### Agent-artifact gate

AI tooling leaves files the reachability trace can't see: canonical workspace
conventions (`CLAUDE.md`, `AGENTS.md`, `.claude/`) and third-party plugin droppings
(transcripts, caches, agent scratch, plugin state). The skill detects these and
routes them through a dedicated four-way gate — **leave as-is / untrack
(`git rm --cached` + gitignore) / gitignore / delete** — grouped by tool or plugin,
and never touches a canonical file without an explicit choice. When it finds plugin
droppings it opens with a sanitize prompt up front.

## What's inside

```
cut-weight/
├── .claude-plugin/plugin.json
└── skills/cut-weight/
    ├── SKILL.md                          # workflow: baseline -> trace -> classify -> findings -> decide -> act -> verify -> post-mortem
    ├── references/
    │   ├── entry-points.md               # finding true north per ecosystem (Node, Python, no-build web, Blender, Claude plugins, monorepos)
    │   ├── evidence-signals.md           # the classification signals and their precedence
    │   ├── quarantine-protocol.md        # reversible-by-construction mechanics + restore commands
    │   ├── agent-artifacts.md            # Claude/agent artifact taxonomy + the four-way disposition gate
    │   └── review-loop.md                # findings / decision-gate / post-mortem stages + report file shapes
    └── scripts/
        └── inventory.py                  # stdlib-only tree inventory: sizes, dual-clock ages, name signals, artifact + agent-artifact detection
```

## Install

```
/plugin marketplace add enoevol81/enoevol-plugins
/plugin install cut-weight@enoevol-plugins
```

## Trigger phrases

"clean this repo up", "what can I delete", "what's actually needed to run this",
"trim the bloat", "cut the fat", "find unused files", "get rid of dev artifacts" —
including audit-only passes where nothing is removed yet.

## Guarantees the skill makes

- A checkpoint commit before anything moves; the report always includes the exact
  restore command with the real SHA.
- Verification against a recorded baseline (tests/build/start) after every change,
  with automatic restore on regression.
- Honest coverage accounting: "analyzed N of M files", every bound stated, no
  silent caps, no "verified" claims for checks that did not run.
