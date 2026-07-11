# Agent artifacts: the sediment AI tooling leaves behind

Claude Code, Cursor, Aider, and installed/third-party plugins drop files into a
repo that break both halves of the normal analysis:

- The **reachability trace never covers them** -- they are not runtime entry
  points, so nothing in the keep-set reaches them.
- The **age and reference heuristics mis-fire in both directions** -- a
  freshly written `CLAUDE.md` reads as "recently touched, keep by accident"
  when the user may not want it committed at all; a plugin's stale state dir
  reads as "abandoned, quarantine" when the real question is whether it should
  be shared, ignored, or removed.

They also need dispositions the cut/quarantine/keep matrix does not have --
namely **untrack** (stop sharing, keep locally) and **gitignore**. So agent
artifacts get their own gate, run once, separate from Phase 3.

## Two classes

### 1. Canonical shared-workspace files (human-owned)

Instruction and config conventions, not one tool's private state. In a team
repo they are frequently committed on purpose so teammates and CI get the same
guidance -- removing them changes everyone's agent behavior, not just yours.

- Instruction files: `CLAUDE.md`, `AGENTS.md`, `AGENT.md`, `GEMINI.md`,
  `.cursorrules`, `.cursor/rules/*`, `.windsurfrules`, `.clinerules`,
  `.goosehints`, `.github/copilot-instructions.md`, `.aider.conf.yml`
- Committed agent config: `.claude/settings.json`, `.claude/commands/*`,
  `.claude/agents/*`, `.claude/hooks/*`, `.mcp.json`

Never auto-touch these. They pass through the gate every time, defaulting to
**leave as-is**.

### 2. Tool droppings (private / machine-local state)

State a tool writes for itself, usually not meant to be shared.

- Chat/transcript history: `.aider.chat.history.md`, `.aider.input.history`,
  `.specstory/`
- Caches and per-machine config: `.aider.tags.cache*`, agent run logs,
  `.claude/settings.local.json` (per-machine overrides -- should not be
  committed)
- Agent scratch left behind: dated `PLAN-*.md`, `scratch-*`, one-off
  `*-summary.md` from a finished task -- recognizable because they read as
  agent process notes, not project documentation.

Local/third-party plugins (the user named **"Impeccable"**) leave
plugin-specific droppings, usually under `.claude/` or in the repo root.
inventory.py cannot enumerate every plugin, so recognize these by signature: a
file or directory named after the plugin that holds transcripts, logs, or
state rather than source the app runs. Route them through the same gate,
default disposition **sanitize** (untrack, ignore, or delete).

## The disposition gate -- four choices, always ask

Present every detected artifact, grouped by tool or plugin. Never decide a
canonical file silently.

| Disposition | What it does | When it fits |
|---|---|---|
| leave as-is | no change | intentional and shared (a committed `CLAUDE.md` the team relies on) |
| untrack | `git rm --cached <f>`, keep the file on disk, add it to `.gitignore` | you want it locally but out of the shared repo (a personal `CLAUDE.md`, `settings.local.json`) |
| gitignore | add the pattern to `.gitignore`; if the file is already untracked, that is the whole action | keep it and blind future copies (dropping dirs that keep regenerating) |
| delete | remove from disk, via quarantine | pure sediment nobody wants (stale transcripts, dead plugin state) |

- **untrack and delete are different promises.** untrack keeps the user's
  file and only stops sharing it; deleting a canonical file a teammate wrote is
  destructive and is never the default.
- **Deletes transit quarantine.** "delete" here means "quarantine then delete,"
  identical to a CUT/QUARANTINE elsewhere (see
  [quarantine-protocol.md](quarantine-protocol.md)) -- reversible.
- **An untrack still lands as a commit** (the index removal + `.gitignore`
  edit), in its own commit, separate from the quarantine moves. Its undo is
  `git add <path>` + removing the ignore line -- NOT `git revert`, which
  fails on untrack commits (git refuses to overwrite the untracked
  working-tree copy). See the Restoring section of
  [quarantine-protocol.md](quarantine-protocol.md).

## Shared-workspace caution

Before proposing untrack or delete on a *tracked* canonical file, check whether
others depend on it: is it on the default branch, referenced by CI, or named in
the README/CONTRIBUTING as project setup? If so, say that on the gate line and
default to **leave as-is**. The point of untrack over delete exists precisely
because a shared file is usually wanted -- just not, perhaps, in the index.

## The sanitize prompt

When inventory flags any tool droppings (class 2), open with the one-line gate
the user asked for, up front:

```
Sanitize N agent/plugin artifacts from <tool/plugin>?
  (leave / untrack / gitignore / delete -- choose per group)
```

Group by source so the choice is one decision per tool, not per file. In
**audit mode**, list the proposed dispositions and change nothing.
