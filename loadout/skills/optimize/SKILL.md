---
name: optimize
description: For a stated goal, audit the active Claude Code loadout, recommend which plugins, MCP servers, skills, and agents to enable/disable/add, lay out how to use them to achieve the goal, and design a parallelization strategy when it helps. Use when the user wants to tune AND deploy their setup for a task.
argument-hint: <what you're trying to accomplish>
allowed-tools: Bash, Read, Glob
---

# Loadout Optimizer

Tune AND plan the user's Claude Code setup for this goal: **$ARGUMENTS**

If `$ARGUMENTS` is empty, ask what they're trying to accomplish, then continue.

## Step 1 — Snapshot the environment (read-only, filesystem-first)
Run the collector and read its full output. It reconciles what is *installed* against what is *enabled* across user and project scope:

```
python3 "$CLAUDE_PLUGIN_ROOT/scripts/collect-inventory.py"
```

If `$CLAUDE_PLUGIN_ROOT` is unset, locate `collect-inventory.py` relative to this skill file, or read these directly:
- **Installed plugins:** `~/.claude/plugins/installed_plugins.json`, `~/.claude/plugins/known_marketplaces.json`, `~/.claude/plugins/cache/`
- **Enabled state:** `enabledPlugins`, `enabledMcpjsonServers`, `disabledMcpjsonServers`, `extraKnownMarketplaces`, `hooks` in `~/.claude/settings.json`, `./.claude/settings.json`, `./.claude/settings.local.json`
- **MCP config:** `./.mcp.json` and the project slice of `~/.claude.json`
- **Skills / agents:** `./.claude/skills/`, `~/.claude/skills/`, `./.claude/agents/`, `~/.claude/agents/`

Build an inventory: each asset's name, type, scope, state (installed? enabled/disabled?), capability. Flag MCP servers with `alwaysLoad: true` (upfront context cost).

## Step 2 — Analyze against the goal
Classify each asset relative to "$ARGUMENTS": **directly useful**, **dead weight** (enabled but irrelevant — note context cost), **redundant/overlapping**, or **missing** (a needed capability nothing provides).

## Step 3 — Tune the loadout (ENABLE / DISABLE / ADD)
Copy-paste commands, one-line rationale each:
- **ENABLE** — `claude plugin enable <plugin>@<marketplace>`; for MCP, add to `enabledMcpjsonServers` (or remove from `disabledMcpjsonServers`).
- **DISABLE** — `claude plugin disable <plugin>@<marketplace>`; for MCP, add to `disabledMcpjsonServers`. State the rough context/token saving.
- **ADD** — real install commands: `/plugin marketplace add anthropics/claude-plugins-official` then `/plugin install <name>@claude-plugins-official`; `npx skills add <github-url>`; `claude mcp add <name> ...`. If unsure of an exact name, describe the capability + generic install pattern. Never invent flags.

## Step 4 — Execution plan (how to USE the loadout for the goal)
Map the goal to concrete moves using the assets that are (or will be) enabled:
- Break "$ARGUMENTS" into sub-parts. For each, name the specific skill/command, MCP server, or agent to use, what it consumes, and what it produces.
- Show the order and the handoffs (one step's output feeding the next).
- Prefer existing assets over adding new ones; only invoke what the goal needs.

## Step 5 — Parallelization plan (only if it helps)
Decide parallel vs sequential:
- **Parallelize** when sub-tasks are independent, touch distinct files/dirs, or benefit from isolated context / a fresh perspective.
- **Stay sequential** when a step depends on a prior step's output, edits target the same file, or the work is exploratory and needs back-and-forth.

If parallel helps, design the fan-out:
- One subagent per independent stream, each owning **distinct files/dirs** (two subagents editing the same file will conflict).
- Assign models: a capable orchestrator (e.g. Opus) + cheaper workers (Sonnet/Haiku) via each agent's `model` field or `CLAUDE_CODE_SUBAGENT_MODEL`.
- Use `isolation: worktree` in a subagent's frontmatter when it needs a clean git worktree.
- Constraints: subagents run in isolated context, **cannot spawn their own subagents**, and **don't see each other's work in real time** — the orchestrator collects and reconciles. For multi-level orchestration use Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`).
- Flag the cost: parallel fan-out **multiplies** token usage.

Then give a copy-paste dispatch prompt. If sequential is better, say why and give the ordered single-session steps.

## Step 6 — Confirm before applying
Present the full plan first. **Do not modify settings or run enable/disable until the user explicitly confirms.** Never hard-delete plugins or edit `~/.claude.json` destructively. After applying, note that MCP / hook / agent changes may need a Claude Code restart or `/reload-plugins`.

## Output format
1. One-line restatement of the goal. 2. Inventory summary. 3. Tune: ENABLE / DISABLE / ADD. 4. Execution plan. 5. Parallelization verdict + plan. 6. Estimated context impact, then a single confirmation question.
