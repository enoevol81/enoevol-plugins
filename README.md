# enoevol-plugins

A persistent Claude plugin marketplace for Matthew Cohen / Enoevol. Each plugin packages a single skill so you can install exactly what you need.

## Plugins

| Plugin | What it does |
| --- | --- |
| **personal-voice** | Matt's personal brand voice for any first-person writing — captions, posts, bios, newsletters, proposals, cold outreach. |
| **portfolio-story-builder** | Audit and organize a folder of design/creative work, then turn it into ranked, documented portfolio stories and a slide deck. |
| **vanish-brand-discovery** | Editorial discovery research for Vanish magazine — brand profiles and feature Q&A at the convergence of fashion and outdoor design. |
| **weavy-pipeline-director** | Expert guidance for Weavy / Figma Weave — model selection, node architecture, and scalable AI image/video pipelines. |
| **loadout** | Audit and optimize your active Claude Code loadout — inventory of plugins, MCP servers, skills, agents, and hooks, with tuning recommendations for any goal. |
| **hands-free** | Turn a plain-language desired end result into a meticulously crafted `/goal` command that launches a Lead-orchestrated, parallelized multi-agent workflow. |
| **icon-forge** | Research a project's platform, run a parallel multi-agent pipeline to design a cohesive icon set, then install the icons into your live environment (Blender, web, VS Code, Electron) via a bundled MCP server. |
| **swiss-design** | Apply Swiss / International Typographic Style discipline to any visual work — grid construction, typographic hierarchy, layout critique, and ruthless reduction, with canonical visual references and a nine-point approval gate. |

## Using the marketplace

Add the marketplace, then install any plugin from it:

```
/plugin marketplace add enoevol81/enoevol-plugins
/plugin install personal-voice@enoevol-plugins
```

Swap in any plugin name from the table above.

## Structure

```
enoevol-plugins/
├── .claude-plugin/
│   └── marketplace.json        # lists all plugins
├── personal-voice/
│   ├── .claude-plugin/plugin.json
│   └── skills/personal-voice/SKILL.md
├── portfolio-story-builder/
│   ├── .claude-plugin/plugin.json
│   └── skills/portfolio-story-builder/{SKILL.md, references/, scripts/}
├── vanish-brand-discovery/
│   ├── .claude-plugin/plugin.json
│   └── skills/vanish-brand-discovery/SKILL.md
├── weavy-pipeline-director/
│   ├── .claude-plugin/plugin.json
│   └── skills/weavy-pipeline-director/{SKILL.md, references/}
├── loadout/
│   ├── .claude-plugin/plugin.json
│   ├── scripts/collect-inventory.py
│   └── skills/{audit,optimize}/SKILL.md
├── hands-free/
│   ├── .claude-plugin/plugin.json
│   ├── commands/hands-free.md
│   └── skills/hands-free/{SKILL.md, references/, examples/}
├── icon-forge/
│   ├── .claude-plugin/plugin.json
│   ├── .mcp.json
│   ├── mcp/                          # bundled MCP server (Node, stdio)
│   └── skills/icon-forge/{SKILL.md, agents/, references/, scripts/}
└── swiss-design/
    ├── .claude-plugin/plugin.json
    └── skills/swiss-design/{SKILL.md, references/, assets/references/}
```

Each plugin is self-contained. To add a new skill, create a new top-level plugin directory with its own `.claude-plugin/plugin.json` and `skills/<name>/SKILL.md`, then add an entry to `.claude-plugin/marketplace.json`.
