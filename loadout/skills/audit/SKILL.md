---
name: audit
description: >-
  Produce a read-only health report of the active Claude Code setup — full
  inventory of installed vs enabled plugins, MCP servers, skills, agents, slash
  commands, and hooks, with estimated always-loaded context cost, dead-weight,
  redundancy, and hygiene flags. Makes no changes. Use when the user wants to
  see what they have equipped, asks "what's in my loadout / setup / what
  plugins do I have", or wants a periodic setup checkup.
allowed-tools: Bash, Read, Glob, Grep
---

# Loadout Audit

Read-only health report of the active setup. No goal needed. Make **no** changes,
run **no** enable/disable/install commands.

## Step 1 — Snapshot

Run the collector:

```
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/collect-inventory.py"
```

- If `python3` is not found (common on Windows), retry with `python`, then `py -3`.
- If `${CLAUDE_PLUGIN_ROOT}` is unset, locate the script with Glob
  (`**/loadout/scripts/collect-inventory.py` under `~/.claude/plugins/cache/`),
  or fall back to reading the raw config files by hand using the source map in
  `${CLAUDE_PLUGIN_ROOT}/references/inventory-sources.md`.

The collector is read-only and never stack-traces: missing files print
`(none)` and malformed JSON prints the parse error inline. Treat any
`[unreadable: ...]` or `[error: ...]` line as a **Hygiene finding**, not a
reason to stop.

## Step 2 — Interpret context cost

- The collector prints `~N tok` (chars/4) beside every skill, agent, and
  command description, plus a **CONTEXT BUDGET** summary — these descriptions
  and all CLAUDE.md files are loaded every session whether used or not.
- MCP tool schemas also load per enabled server but cannot be measured from
  disk; flag `alwaysLoad` servers as the likely-heavy ones and tell the user
  `/context` gives the exact figure.
- The `plugin cache` budget line counts every *cached* plugin; only ENABLED
  ones actually cost anything — cross-check against the reconciliation table.

## Step 3 — Report (use exactly this structure so runs are comparable over time)

```
# Loadout Audit — <YYYY-MM-DD> — <project path>

## 1. Inventory
| Name | Type | Scope | State | Provides |
(one row per plugin, MCP server, skill, agent, command; hooks summarized per scope)

## 2. Context budget
Always-loaded estimate: ~N tokens (from collector summary).
Heaviest items: <top 3 with token counts>. alwaysLoad MCP servers: <list or none>.

## 3. Dead weight
Installed-but-disabled plugins; enabled assets irrelevant to this machine/project.

## 4. Redundancy
Overlapping capabilities (compare skill descriptions; Grep the cached SKILL.md
bodies if two look similar) — say which to keep and why.

## 5. Hygiene
Enabled-but-unregistered plugins (@skills-dir / --plugin-dir?), unknown
extraKnownMarketplaces, JSON parse errors, skills whose description failed to
parse (they will never trigger), MCP servers enabled at user scope that only
one project uses.

## 6. Top 3 actions
Numbered, most impactful first.
```

End by pointing at `/loadout:optimize <goal>` for goal-driven tuning.
Make no changes.
