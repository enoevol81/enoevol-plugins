# enoevol-plugins

A persistent Claude plugin marketplace for Matthew Cohen / Enoevol. Each plugin packages a single skill so you can install exactly what you need.

## Plugins

| Plugin | What it does |
| --- | --- |
| **loadout** | Audit and optimize your active Claude Code loadout — inventory of plugins, MCP servers, skills, agents, and hooks, with tuning recommendations for any goal. |
| **hands-free** | Turn a plain-language desired end result into a meticulously crafted `/goal` command that launches a Lead-orchestrated, parallelized multi-agent workflow. |

## Using the marketplace

Add the marketplace, then install any plugin from it:

```
/plugin marketplace add enoevol81/enoevol-plugins
/plugin install <plugin>@enoevol-plugins
```

Swap in any plugin name from the table above.

## Structure

```
enoevol-plugins/
├── .claude-plugin/
│   └── marketplace.json        # lists all plugins
├── loadout/
│   ├── .claude-plugin/plugin.json
│   ├── scripts/collect-inventory.py
│   └── skills/{audit,optimize}/SKILL.md
└── hands-free/
    ├── .claude-plugin/plugin.json
    ├── commands/hands-free.md
    └── skills/hands-free/{SKILL.md, references/, examples/}
```

Each plugin is self-contained. To add a new skill, create a new top-level plugin directory with its own `.claude-plugin/plugin.json` and `skills/<name>/SKILL.md`, then add an entry to `.claude-plugin/marketplace.json`.
