# enoevol-plugins

A persistent Claude plugin marketplace for Matthew Cohen / Enoevol. Each plugin packages a single skill so you can install exactly what you need.

## Plugins

| Plugin | What it does |
| --- | --- |

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
└── .claude-plugin/
    └── marketplace.json        # lists all plugins
```

Each plugin is self-contained. To add a new skill, create a new top-level plugin directory with its own `.claude-plugin/plugin.json` and `skills/<name>/SKILL.md`, then add an entry to `.claude-plugin/marketplace.json`.
