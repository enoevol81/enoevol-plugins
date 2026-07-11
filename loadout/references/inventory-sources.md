# Inventory source map (manual fallback)

Shared by `/loadout:audit` and `/loadout:optimize`. Use this only when
`scripts/collect-inventory.py` (sibling of this file's parent directory,
i.e. `${CLAUDE_PLUGIN_ROOT}/scripts/collect-inventory.py`) cannot be run —
no Python on PATH, or the plugin root can't be located. The script reads
exactly these sources; reading them by hand yields the same inventory.

All paths below work on Windows too — `~` means the user profile dir
(`C:\Users\<name>` / `$HOME`); `./` means the current project directory.

## Installed plugins (what exists)

| Source | What it tells you |
|---|---|
| `~/.claude/plugins/installed_plugins.json` | Registry of marketplace-installed plugins: `plugins` map keyed `name@marketplace`, entries carry `scope` + `version` |
| `~/.claude/plugins/known_marketplaces.json` | Marketplaces the CLI knows about |
| `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` | The actual shipped files per plugin: `skills/*/SKILL.md`, `agents/*.md`, `commands/**/*.md`, `hooks/`, `.mcp.json` |

## Enabled state (what actually loads)

Read all three, in precedence order **project-local > project > user**:

| Source | Keys |
|---|---|
| `~/.claude/settings.json` (user) | `enabledPlugins` (map `name@marketplace` → bool), `enabledMcpjsonServers`, `disabledMcpjsonServers`, `extraKnownMarketplaces`, `hooks` |
| `./.claude/settings.json` (project) | same keys |
| `./.claude/settings.local.json` (project-local) | same keys |

A plugin **installed** but with `enabledPlugins[...] = false` is dead weight;
**enabled** but absent from the install registry usually means `@skills-dir`
or `--plugin-dir` loading.

## MCP servers

| Source | What it tells you |
|---|---|
| `./.mcp.json` | Project-shared server definitions (`mcpServers`) |
| `~/.claude.json` → top-level `mcpServers` | User-scoped servers |
| `~/.claude.json` → `projects["<abs project path>"]` | Project-slice: local `mcpServers`, plus `enabledMcpjsonServers` / `disabledMcpjsonServers` approvals |

`"alwaysLoad": true` on a server config = its tool schemas are loaded up
front every session (context cost even when unused). A configured server in
none of the enabled/disabled lists is pending approval.

## Standalone skills, agents, commands

| Source | Notes |
|---|---|
| `~/.claude/skills/<name>/SKILL.md` and `./.claude/skills/<name>/SKILL.md` | Frontmatter `description` is ALWAYS in context — that's the per-skill cost |
| `~/.claude/agents/*.md` and `./.claude/agents/*.md` | Same: `description` always loaded |
| `~/.claude/commands/**/*.md` and `./.claude/commands/**/*.md` | Subdirs namespace the command (`ns/deploy.md` → `/ns:deploy`) |

A skill dir containing `.claude-plugin/plugin.json` is an `@skills-dir`
plugin, not a bare skill.

## Memory files (loaded in full, every session)

`./CLAUDE.md`, `./.claude/CLAUDE.md`, `./CLAUDE.local.md`, `~/.claude/CLAUDE.md`.

## Context-cost rule of thumb

Estimated tokens ≈ characters / 4. Always-loaded cost = sum of every enabled
skill/agent/command description + all CLAUDE.md files + MCP tool schemas.
Schemas can't be measured from disk — run `/context` inside a session for the
true number.
