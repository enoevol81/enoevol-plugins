# The `/goal [...]` Command Specification

The `/goal` block is the contract handed to the **Lead orchestration agent**. It
must be self-contained: a fresh orchestrator with no prior conversation context
executes it verbatim. Render it as a single fenced code block.

**Hard size limit: the entire `/goal [...]` block must be under 4000 characters**
— Claude's limit for a goal. Write tersely from the start and verify the count
before emitting; see "Budget & compression" below.

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

  ORCHESTRATION:
    LEAD: <the orchestrator's standing instructions — see "Lead mandate" below>

    MILESTONE 1 — <name>  [depends on: none]
      goal: <what this milestone produces>
      done when: <definition of done for this milestone>
      parallel subtasks:
        - [@<agent-skill>] <subtask> → produces <artifact> | done when <check>
        - [@<agent-skill>] <subtask> → produces <artifact> | done when <check>
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
  `depends on`. A milestone may only start once its dependencies are `done`.
- **parallel subtasks** — the **ribs**. Independent units *within* one milestone
  that the Lead dispatches concurrently to skilled sub-agents. Each line:
  `[@skill] <imperative subtask> → produces <artifact> | done when <check>`.
  Never place two subtasks in the same milestone if one depends on the other —
  split them across milestones instead.
- **gate** — `none`, a `review by @reviewer`, or `HUMAN APPROVAL`. Mandatory
  before any outward-facing action (publish/send/deploy).

## Lead mandate (standing instructions for the orchestrator)

Embed these as the `LEAD:` value:

> Execute milestones strictly in dependency order. For each milestone, dispatch
> all parallel subtasks at once to the named skilled sub-agents, then collect and
> integrate their artifacts. Dispatch each sub-agent with only the context it
> needs — its subtask, the named input artifact(s), and the binding constraints —
> not this conversation or unrelated milestone output, to keep token use low.
> Verify the milestone's "done when" before advancing. Honor every gate — never
> cross a HUMAN APPROVAL gate without explicit sign-off. On subtask failure, retry
> once with feedback, then escalate. Maintain a running status of milestone/
> subtask state. Declare the goal complete only when all SUCCESS CRITERIA are met;
> then surface the DELIVERABLES.

Keep the mandate terse — when space is tight, the LEAD value may be shortened to
its essentials (dependency order, fan out per milestone, minimal per-agent
context, honor gates, retry-once-then-escalate, verify before complete) as long
as the intent survives.

## Budget & compression (≤ 4000 characters)

The whole block — from `/goal [` to the closing `]` — must be under 4000
characters. Write lean from the start, then verify the count before emitting. If
it runs over, compress in this order until it fits:

1. **Tighten wording.** Strip filler ("in order to" → "to"), drop articles where
   meaning survives, and use the terse subtask grammar
   `[@skill] subtask → artifact | done when check`.
2. **Drop empty sections.** Omit ASSUMPTIONS if the user specified everything;
   omit CONSTRAINTS if there are none. Don't emit empty headers.
3. **Shorten the LEAD mandate** to its essentials (see Lead mandate note above).
4. **Cut or merge non-essential subtasks/milestones.** Keep only the spine and
   ribs that genuinely move toward the outcome; never manufacture work.
5. **Never truncate mid-structure.** A goal that stops mid-milestone is worse
   than a leaner, complete one. Compress, don't clip.

This budget also serves token frugality — a tight goal is cheaper for the Lead
and every sub-agent to carry.

## Quality bar before you emit

- [ ] OUTCOME is a single outcome-shaped sentence.
- [ ] Every milestone has `depends on`, `done when`, and a gate decision.
- [ ] Every subtask names a roster skill, an artifact, and a done-check.
- [ ] No parallel subtask depends on a sibling in the same milestone.
- [ ] Every outward-facing action sits behind an explicit gate.
- [ ] Assumptions are listed, not buried.
- [ ] The block reads correctly with zero external context.
- [ ] The LEAD mandate tells the orchestrator to give each sub-agent only the
      context it needs (no full-conversation hand-off).
- [ ] **The whole block is under 4000 characters** — counted, not estimated.
