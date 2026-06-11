# Hands Free (Claude Code plugin)

Turn a plain-language **desired end result** into a single, meticulously crafted
`/goal [...]` command that launches a **Lead-orchestrated, parallelized
multi-agent workflow**.

The plugin packages the `hands-free` skill. When invoked, it captures the
outcome you want, runs a short bounded round of context-refining questions, then
emits one self-contained `/goal` block for a Lead orchestration agent to execute
step-by-step while fanning out independent subtasks to skilled sub-agents.

Core design rule: **linear spine, parallel ribs** — milestones run in dependency
order, only genuinely-independent subtasks run in parallel, and every
outward-facing action sits behind an explicit approval gate.

Each emitted goal also ships with:

- **Cost-aware model routing** — every subtask is tagged with a model tier
  (`basic`/`standard`/`deep`), defaulting to the cheapest model that can do the
  job so simple work doesn't pay frontier-model prices.
- **Hands-free execution mode** — interactive CLI/desktop runs use elevated
  (auto-accept) permissions and run to completion, halting only on a high-level
  issue or a HUMAN APPROVAL gate (gates always bind).
- **Headless run instructions** — a ready-to-paste `claude -p …` snippet for
  running the same goal unattended (cron/CI/background), emitted alongside the
  block.

## Install

Distributed via the [enoevol-plugins](https://github.com/enoevol81/enoevol-plugins)
marketplace.

```bash
# 1. Add the marketplace
/plugin marketplace add enoevol81/enoevol-plugins

# 2. Install the plugin
/plugin install hands-free@enoevol-plugins
```

Or, for local development without installing:

```bash
claude --plugin-dir ./hands-free
```

## Use

Describe an outcome and ask for it hands-free, e.g.:

> "Hands free — get the Q3 launch landing page researched, built, and reviewed."

The skill activates on outcome-shaped requests ("I want to end up with…",
"just make X happen", "set it and forget it") and replies with a ready-to-run
`/goal` block plus a short summary of any assumptions it made.

You can also invoke it explicitly as a slash command:

```
/hands-free <your desired end result>
```

The fully-namespaced skill form `/hands-free:hands-free <...>` also works.

## Contents

```
hands-free/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── hands-free.md             # /hands-free slash command → delegates to skill
└── skills/
    └── hands-free/
        ├── SKILL.md                  # operating instructions + workflow
        ├── references/
        │   ├── goal-spec.md          # canonical /goal [...] structure
        │   ├── agent-roster.md       # skilled sub-agents + parallelization rules
        │   └── exploration.md        # context-refinement question checklist
        └── examples/
            └── example-run.md        # full worked request → /goal
```

## Notes

- `/goal` is the convention this skill **emits**. In the Mission Control
  ecosystem it is consumed downstream as the "Hands-free Goal Builder" workflow;
  if a fixed `/goal` schema exists there, keep `references/goal-spec.md` in sync.
- The agent roster mirrors Mission Control's roles (`researcher`, `coder`,
  `tester`, `reviewer`, `devops`, `content`, `assistant`).
- **Goals are built to a character budget** — Claude caps a goal at 4000
  characters, so the skill targets ≤3500 and builds lean by construction: it drops
  in the fixed boilerplate (canonical `EXECUTION MODE` + `LEAD`) verbatim, then
  fits the variable sections (milestones are the main lever) into the remainder —
  rather than writing long and trimming back. It counts the block to confirm, and
  compresses (never truncates) only in the rare case it still runs over. See
  `references/goal-spec.md` → "Budget: write lean by construction".
- **Lean context downstream.** The emitted goal instructs the Lead to dispatch
  each sub-agent with only the slice it needs — its subtask, the named upstream
  artifact(s), and binding constraints — not the main-window conversation. This
  keeps token consumption (and cost) down across the whole run.
- **Model tiers, defaulted down.** Subtasks carry a `(basic|standard|deep)` tier;
  the Lead dispatches the matching model class. See
  `skills/hands-free/references/agent-roster.md` → "Model tier routing".
- **Elevated, autonomous runs.** The `EXECUTION MODE` block tells interactive
  CLI/desktop runs to auto-accept permissions and only stop for high-level issues
  or approval gates. For unattended runs, the emitted "Run it headless" section
  maps this onto `claude -p` flags (`--permission-mode acceptEdits` or, in a
  trusted dir, `--dangerously-skip-permissions`).
