# enoevol-plugins

A persistent Claude plugin marketplace for Matthew Cohen / Enoevol. Each plugin packages a focused workflow so you can install exactly what you need.

## Plugins

| Plugin                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **loadout**             | Audit and optimize your active Claude Code loadout — inventory of installed vs enabled plugins, MCP servers, skills, agents, commands, and hooks, with context-cost estimates and tuning recommendations for any goal.                                                                                                                                                                                                                                                                                                   |
| **hands-free**          | Plan, execute and resume authorized multi-step work with portable progress tracking and completion evidence.                                                                                                                                                                                                                                                                                                                                                                                                             |
| **icon-forge**          | Point it at any project and it researches the platform, runs a parallel multi-agent pipeline to design a cohesive icon set, then installs the icons into your live environment (Blender, web, VS Code, Electron) via a bundled MCP server.                                                                                                                                                                                                                                                                               |
| **swiss-design**        | Apply Swiss / International Typographic Style design discipline to any visual work — grid construction with real numbers, typographic hierarchy, asymmetrical balance, layout critique, and ruthless reduction. Two modes (make layout specs/CSS, or review a layout against a nine-point approval gate) plus an annotated canon of Swiss reference works.                                                                                                                                                               |
| **design-signal-scout** | A design, technology, and cultural intelligence system for creative studios and independent designers — monitors footwear, industrial/product design, 3D/Blender, architecture, and AI-creative-tool signals, scores and clusters them, mines community pain points, and converts findings into content and product opportunities.                                                                                                                                                                                       |
| **cut-weight**          | Intent-informed repository sanitation: a brief grouped conversation, development-residue cleanup, local-only archiving, and reconciliation of surviving guidance while protecting operational files.                                                                                                                                                                                                                                                                                                                     |
| **critic-layer**        | Real-time, in-browser UX/UI design review in three modes — pin sticky notes, draw freehand/arrow/shape markup, and make live element edits captured as exact before→after diffs. Place sticky notes directly on a live web page and synthesize them into an agent-ready change brief plus a paste-ready Claude Code prompt; a review-to-instruction layer, not a design editor.                                                                                                                                          |
| **canon-check**         | Two-part design-canon workflow. Audit: scans a repo's durable artifacts — design tokens, CLAUDE.md and style docs, hardcoded component defaults, session/git history, and prior design-review outputs — to surface design decisions that quietly became permanent canon, flag ones only ever said once, and catch where sources contradict each other. Update: an interactive follow-up that realigns the cornerstone documents (CLAUDE.md, design.md, AGENTS.md, style guides) to where the product is actually headed. |
| **design-steward**      |  **design-steward** \| Review interfaces, align design decisions, execute and verify changes, and clean development residue with seven independent skills including Cut Weight.                                                                                                                                                                                                                                                                                                                                          |
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
├── _dev/                         # repo tooling (build, package, tests); not a plugin
├── loadout/
│   ├── .claude-plugin/plugin.json
│   ├── scripts/collect-inventory.py
│   ├── references/inventory-sources.md
│   └── skills/{audit,optimize}/SKILL.md
├── hands-free/
│   ├── .claude-plugin/plugin.json
│   ├── commands/hands-free.md
│   ├── hooks/                         # optional legacy hook; disabled by default
│   ├── scripts/run_state.py          # resumable execution ledger
│   └── skills/{hands-free,execute,resume}/
├── icon-forge/
│   ├── .claude-plugin/plugin.json
│   ├── .mcp.json
│   ├── mcp/                          # bundled MCP server (Node, stdio)
│   └── skills/icon-forge/{SKILL.md, agents/, references/, scripts/}
├── swiss-design/
│   ├── .claude-plugin/plugin.json
│   └── skills/swiss-design/{SKILL.md, references/, assets/references/}
├── design-signal-scout/
│   ├── .claude-plugin/plugin.json
│   ├── references/operating-model.md          # shared by all 10 skills below
│   └── skills/{source-manager,signal-scout,visual-trend-analyzer,
│       technology-radar,pain-point-miner,trend-clusterer,
│       inspiration-curator,content-opportunity-generator,
│       weekly-creative-brief,signal-feedback-loop}/SKILL.md
├── cut-weight/
│   ├── .claude-plugin/plugin.json
│   └── skills/cut-weight/{SKILL.md, references/, scripts/}
├── critic-layer/
│   ├── .claude-plugin/plugin.json
│   ├── scripts/source_candidates.py
│   └── skills/{critic-layer,brief,verify}/
├── design-steward/                  # curated seven-skill public package; generated components
│   ├── .claude-plugin/plugin.json
│   ├── skills/{audit,review,brief,align,execute,verify,cleanup}/
│   ├── components/                   # self-contained release copies
│   └── scripts/                      # ledger, freshness, source mapping
└── canon-check/
    ├── .claude-plugin/plugin.json
    └── skills/{canon-check/{SKILL.md, references/, scripts/},
        canon-update/{SKILL.md, references/}}
```

Each plugin is self-contained. To add a new skill, create a new top-level plugin directory with its own `.claude-plugin/plugin.json` and `skills/<name>/SKILL.md`, then add an entry to `.claude-plugin/marketplace.json`.
