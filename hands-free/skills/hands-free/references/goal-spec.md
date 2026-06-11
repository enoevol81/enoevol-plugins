# The `/goal [...]` Command Specification

The `/goal` block is the contract handed to the **Lead orchestration agent**. It
must be self-contained: a fresh orchestrator with no prior conversation context
executes it verbatim. Render it as a single fenced code block.

**Size budget: aim for ≤ 3500 characters; 4000 is the hard ceiling.** 4000 is
Claude's limit for a goal, but do **not** write up to it and trim back. Build the
block lean from the start against a per-section budget, keeping ~500 characters of
headroom. Most of the block is fixed boilerplate (EXECUTION MODE + LEAD) you copy
verbatim; the variable content is milestones/subtasks. See "Budget: write lean by
construction" below.

## Anatomy

```
/goal [
  OUTCOME: <one sentence: the end state the user wants to exist>

  SUCCESS CRITERIA:
    - <observable, testable condition 1>
    - <observable, testable condition 2>
    - ...

  CONSTRAINTS:
    - <hard rules, brand/voice, budget, deadline, tech, do-nots>

  ASSUMPTIONS:
    - <every default you chose on the user's behalf>

  EXECUTION MODE: On interactive CLI/desktop runs, use elevated (auto-accept)
    permissions and run to completion; halt only for a high-level issue
    (destructive/irreversible action, outward publish/send/deploy, security or
    data-loss risk, over-budget spend, or a step failing after one retry) or a
    HUMAN APPROVAL gate. Gates always bind. Prefer the cheapest viable tier.

  ORCHESTRATION:
    LEAD: Run milestones in dependency order. Per milestone, dispatch all parallel
      subtasks at once on each subtask's tier, giving each sub-agent only its
      subtask + named input artifact(s) + binding constraints (never this whole
      goal). Verify "done when" before advancing; honor every gate; never cross a
      HUMAN APPROVAL gate without sign-off. Retry a failed subtask once, then
      escalate. Declare complete only when all SUCCESS CRITERIA are met.

    MILESTONE 1 — <name>  [depends on: none]
      goal: <what this milestone produces>
      done when: <definition of done for this milestone>
      parallel subtasks:
        - [@<agent-skill>] (<tier>) <subtask> → produces <artifact> | done when <check>
        - [@<agent-skill>] (<tier>) <subtask> → produces <artifact> | done when <check>
      gate: <none | review by @reviewer | HUMAN APPROVAL before proceeding>

    MILESTONE 2 — <name>  [depends on: Milestone 1]
      goal: ...
      done when: ...
      parallel subtasks:
        - [@<agent-skill>] ...
      gate: ...

    MILESTONE N — <name>  [depends on: ...]
      ...

  DELIVERABLES:
    - <final artifact(s) and where they should land>

  ESCALATION:
    - If blocked > <threshold>, or a gate is rejected twice, pause and report to
      the user with the specific blocker and options.
]
```

## Field rules

- **OUTCOME** — exactly one sentence, outcome-shaped ("a published, reviewed
  landing page for the Q3 launch"), never task-shaped ("write some copy").
- **SUCCESS CRITERIA** — 2–6 bullets, each independently verifiable. These are
  what the Lead checks before declaring the goal complete.
- **CONSTRAINTS** — carry through every hard rule the user or repo imposes
  (brand voice, "never post without approval", budget, deadline, stack).
- **ASSUMPTIONS** — list every default chosen for the user. Empty only if the
  user specified everything.
- **MILESTONES** — the **linear spine**. Ordered, each with an explicit
  `depends on`. A milestone may only start once its dependencies are `done`. The
  `goal:` line is optional — drop it when the milestone name plus `done when`
  already convey the intent (a cheap, lossless way to stay lean).
- **EXECUTION MODE** — the autonomy + efficiency contract. This is **fixed
  boilerplate (~385 chars): copy the canonical paragraph from the anatomy above
  verbatim.** Do not re-author or expand it — it already covers elevated perms,
  halt-only-on-high-level-issue, binding gates, and cheapest-tier routing. Only
  the rare goal needs an extra clause; never balloon it into per-bullet prose.
- **parallel subtasks** — the **ribs**. Independent units *within* one milestone
  that the Lead dispatches concurrently to skilled sub-agents. Each line:
  `[@skill] (tier) <imperative subtask> → produces <artifact> | done when <check>`.
  The `(tier)` is one of `(basic|standard|deep)` — see
  `agent-roster.md` → "Model tier routing"; default to the cheapest tier that can
  do the job. Never place two subtasks in the same milestone if one depends on the
  other — split them across milestones instead.
- **gate** — `none`, a `review by @reviewer`, or `HUMAN APPROVAL`. Mandatory
  before any outward-facing action (publish/send/deploy).

## Lead mandate (standing instructions for the orchestrator)

The `LEAD:` value is **fixed boilerplate (~474 chars): copy the canonical
paragraph from the anatomy above verbatim.** It already encodes every essential —
dependency order, fan out per milestone on the tagged tier, minimal per-agent
context, verify "done when", honor gates (never cross HUMAN APPROVAL without
sign-off), retry-once-then-escalate, and declare complete only on all SUCCESS
CRITERIA. Do not re-author it per goal; re-typing from memory is how it bloats.
Only add a clause if a specific goal genuinely needs one.

## Headless-run addendum (emitted *after* the block)

After the fenced `/goal` block and the plain-language summary, append a short
**"Run it headless"** section. This is guidance for the user — it lives *outside*
the `/goal` block and does **not** count against the 4000-character budget. It
tells the user how to execute the same goal non-interactively (e.g. cron, CI, an
unattended terminal). Keep it to a fenced shell snippet plus one caution line:

```bash
# Save the /goal block to a file, then run unattended:
claude -p "$(cat goal.txt)" \
  --permission-mode acceptEdits \   # auto-accept edits; gates still pause
  --output-format stream-json --verbose

# Fully unattended (trusted/sandboxed dir only — skips ALL permission prompts):
claude -p "$(cat goal.txt)" --dangerously-skip-permissions
```

Caution to include verbatim-ish: `--dangerously-skip-permissions` bypasses every
permission prompt — run it only in a directory/repo you trust, and the goal's
HUMAN APPROVAL gates become your responsibility to wire in (e.g. split the run at
the gate). Use `--permission-mode acceptEdits` for a safer middle ground, and add
`--model <id>` only to pin a single tier for the whole run (otherwise the Lead
routes per-subtask tiers itself).

## Budget: write lean by construction (target ≤ 3500, ceiling 4000)

Do not write to the 4000 ceiling and trim back — that consistently lands at the
edge. Build the block to a **per-section budget** so it is lean the first time,
and treat the character count as a *confirmation* at the end, not a rescue step.

**Step 1 — Spend the fixed boilerplate first (~1000 chars, non-negotiable).**
Drop in the two canonical blocks verbatim and the scaffolding:

| Part | Budget |
| --- | --- |
| Scaffolding (`/goal [`, headers, `]`) | ~150 |
| EXECUTION MODE (canonical, verbatim) | ~385 |
| LEAD (canonical, verbatim) | ~474 |

**Step 2 — Budget the variable content against the remaining ~2500.** Sketch the
skeleton, then fill each section to its allowance:

| Section | Budget |
| --- | --- |
| OUTCOME | ~150 |
| SUCCESS CRITERIA (2–6 bullets) | ~350 |
| CONSTRAINTS | ~250 |
| ASSUMPTIONS | ~250 |
| MILESTONES + subtasks (the main lever) | ~1300 |
| DELIVERABLES | ~120 |
| ESCALATION | ~120 |

These are guides, not quotas — borrow across rows freely, but if the whole draft
projects past ~3500, cut scope *before* you write it, don't write fat and shave.
The milestones/subtasks block is where almost all variation lives; spend the most
discipline there:

- Use the terse subtask grammar verbatim: `[@skill] (tier) subtask → artifact |
  done when check`. One line per subtask; no prose paragraphs.
- Keep the fewest milestones that reach the outcome. If two milestones could be
  one, make them one.
- Omit empty sections entirely — no ASSUMPTIONS header if you assumed nothing, no
  CONSTRAINTS header if there are none. Never emit an empty header.

**If a finished draft still projects over 4000** (rare, when boilerplate is
already minimal), compress in this order — never truncate mid-structure:

1. Cut or merge non-essential subtasks/milestones (keep only spine + ribs that
   move toward the outcome; never manufacture work).
2. Tighten variable wording — strip filler ("in order to" → "to"), drop articles
   where meaning survives.
3. Trim CONSTRAINTS/ASSUMPTIONS to the load-bearing ones.

Leave the canonical EXECUTION MODE and LEAD blocks intact — they are already
minimal, so cut variable content first. A goal that stops mid-milestone is worse
than a leaner, complete one: compress, don't clip.

This budget also serves token frugality — a tight goal is cheaper for the Lead
and every sub-agent to carry.

## Quality bar before you emit

- [ ] OUTCOME is a single outcome-shaped sentence.
- [ ] Every milestone has `depends on`, `done when`, and a gate decision.
- [ ] Every subtask names a roster skill, a model `(tier)`, an artifact, and a
      done-check.
- [ ] Tiers default to the cheapest viable class; `(deep)` only where justified.
- [ ] EXECUTION MODE block present (elevated perms + halt-only-on-high-level +
      gates still bind).
- [ ] No parallel subtask depends on a sibling in the same milestone.
- [ ] Every outward-facing action sits behind an explicit gate.
- [ ] EXECUTION MODE and LEAD are the canonical blocks, copied verbatim (not
      re-authored).
- [ ] A "Run it headless" addendum follows the block (outside the budget).
- [ ] Assumptions are listed, not buried.
- [ ] The block reads correctly with zero external context.
- [ ] **The whole block is ≤ 3500 characters (4000 hard ceiling)** — counted, not
      estimated, with headroom left rather than written to the edge.
