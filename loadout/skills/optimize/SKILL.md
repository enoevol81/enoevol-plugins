---
name: optimize
description: >-
  For a stated goal, audit the active Claude Code loadout and recommend which
  plugins, MCP servers, skills, agents, and commands to enable, disable, or
  add, then lay out how to use them to achieve the goal. Use when the user
  wants to tune, optimize, or prepare their setup for a task — "set me up
  for X", "what should I enable to do Y", "optimize my loadout for Z".
argument-hint: <what you're trying to accomplish>
allowed-tools: Bash, Read, Glob, Grep
---

# Loadout Optimizer

Tune the user's Claude Code setup for this goal, then plan how to use it: **$ARGUMENTS**

If `$ARGUMENTS` is empty, ask what they're trying to accomplish, then continue.

## Step 1 — Snapshot the environment (read-only)

Run the collector and read its full output. It reconciles what is *installed*
against what is *enabled* across user and project scope, and estimates the
always-loaded context cost of each asset:

```
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/collect-inventory.py"
```

- If `python3` is not found (common on Windows), retry with `python`, then `py -3`.
- If `${CLAUDE_PLUGIN_ROOT}` is unset, locate the script with Glob
  (`**/loadout/scripts/collect-inventory.py` under `~/.claude/plugins/cache/`),
  or read the raw config files by hand using the source map in
  `${CLAUDE_PLUGIN_ROOT}/references/inventory-sources.md`.

The collector never stack-traces; `[unreadable: ...]` lines are findings to
mention, not blockers.

## Step 2 — Analyze against the goal

Classify each asset relative to "$ARGUMENTS":

- **directly useful** — will be invoked for this goal
- **dead weight** — enabled but irrelevant; cite its `~N tok` context cost
- **redundant/overlapping** — two assets covering the same capability
- **missing** — a needed capability nothing currently provides

## Step 3 — Tune the loadout (ENABLE / DISABLE / ADD)

Copy-paste commands, one-line rationale each:

- **ENABLE** — `claude plugin enable <plugin>@<marketplace>`; for MCP, add the
  server to `enabledMcpjsonServers` (or remove it from `disabledMcpjsonServers`).
- **DISABLE** — `claude plugin disable <plugin>@<marketplace>`; for MCP, add to
  `disabledMcpjsonServers`. State the rough token saving from the collector.
- **ADD** — real install commands only:
  `/plugin marketplace add <owner/repo>` then `/plugin install <name>@<marketplace>`,
  or `claude mcp add <name> ...`. If unsure of an exact package name, describe
  the capability plus the generic install pattern. **Never invent flags or
  package names.**

## Step 4 — Execution plan (how to USE the loadout for the goal)

Map the goal to concrete moves using the assets that are (or will be) enabled:

- Break "$ARGUMENTS" into sub-parts. For each, name the specific skill/command,
  MCP server, or agent to use, what it consumes, and what it produces.
- Show the order and the handoffs (one step's output feeding the next).
- Prefer existing assets over adding new ones; only invoke what the goal needs.

## Step 5 — Orchestration handoff (don't design it here)

This skill tunes the setup; it does not own multi-agent orchestration.

- **Sequential is the default** — when steps depend on each other, edits
  converge on the same files, or the work is exploratory. Give the ordered
  single-session steps and say why sequential wins.
- **If the goal genuinely splits into independent, sizable streams**, check the
  inventory for the **hands-free** plugin (this marketplace): it owns
  orchestration — it turns an end result into a `/goal` command executed by a
  Lead orchestrator that fans out parallel skilled sub-agents. Recommend
  invoking it with the goal after the tuning is applied; if it isn't installed,
  list it under ADD in Step 3 (`/plugin install hands-free@enoevol-plugins`).
- Whichever way, flag that parallel fan-out **multiplies token usage** — say
  whether the goal is worth it.

## Step 6 — Confirm before applying

Present the full plan first. **Do not modify settings or run
enable/disable/install until the user explicitly confirms.** Never hard-delete
plugins or edit `~/.claude.json` destructively. After applying, note that
plugin / MCP / hook changes may need a Claude Code restart to load.

## Output format

1. One-line restatement of the goal.
2. Inventory summary (counts + always-loaded token estimate).
3. Tune: ENABLE / DISABLE / ADD with commands.
4. Execution plan.
5. Orchestration verdict (sequential steps, or hand off to hands-free).
6. Estimated context impact of the tune, then a single confirmation question.
