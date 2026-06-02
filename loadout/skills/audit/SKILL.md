---
name: audit
description: Produce a read-only health report of the active Claude Code setup — full inventory of installed vs enabled plugins, MCP servers, skills, agents, and hooks, plus context cost, redundancy, and hygiene flags. Makes no changes. Use when the user wants to see what they have equipped.
argument-hint: (none)
allowed-tools: Bash, Read, Glob
---

# Loadout Audit

Give a read-only health report of the active setup. No goal needed. Make **no** changes.

## Snapshot
Run the collector (cross-platform Python):
```
python3 "$CLAUDE_PLUGIN_ROOT/scripts/collect-inventory.py"
```

If `$CLAUDE_PLUGIN_ROOT` is unset, locate `collect-inventory.py` relative to this skill file or read the raw config files directly:
- **Installed plugins:** `~/.claude/plugins/installed_plugins.json`, `~/.claude/plugins/known_marketplaces.json`, `~/.claude/plugins/cache/`
- **Enabled state:** `enabledPlugins`, `enabledMcpjsonServers`, `disabledMcpjsonServers`, `hooks` in `~/.claude/settings.json`, `./.claude/settings.json`, `./.claude/settings.local.json`
- **MCP config:** `./.mcp.json` and the project slice of `~/.claude.json`
- **Skills / agents:** `./.claude/skills/`, `~/.claude/skills/`, `./.claude/agents/`, `~/.claude/agents/`

## Report
- **Inventory** — table of every plugin (installed? enabled/disabled?), MCP server, skill, agent, and hook: type, scope, state, what it provides.
- **Context budget** — MCP servers flagged `alwaysLoad` vs deferred; call out the heavy ones.
- **Dead weight** — installed-but-disabled clutter, or enabled assets that look unused.
- **Redundancy** — overlapping capabilities; note which to keep.
- **Hygiene** — plugins enabled but missing from the install registry (check `@skills-dir` / `--plugin-dir`), unknown marketplaces in `extraKnownMarketplaces`, servers enabled globally that should be per-project.

End with the top 3 changes worth making, and point to `/loadout:optimize <goal>`. Make no changes.
