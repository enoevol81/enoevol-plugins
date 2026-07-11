# Worked Example: Request → `/goal`

A full pass through the skill so the shape is unambiguous.

## User request

> "Hands free — I want a launch landing page for our new Sneaker Panel Pro
> feature, researched against competitors, written on-brand, built, and ready to
> go live."

## Phase 1 — Capture the end result

End state: a reviewed, on-brand Sneaker Panel Pro launch landing page, built and
staged, awaiting a single go-live approval. Consumer: prospective customers.
Done = the page exists, passes review, and only needs human sign-off to publish.

## Phase 2 — Bounded exploration

Outcome is mostly specified and the user said "hands free," so only the gaps that
change the plan get asked. One batched `AskUserQuestion`:

- **Scope** — single landing page, or page + supporting social teasers?
- **Deadline** — is there a launch date that forces sequencing?
- **Go-live** — auto-publish after review, or hold for your approval?

Everything else defaults (brand voice from the `sneaker-panel-pro` marketing
module; competitor set chosen by the researcher; staging in the existing repo).

*Assume the user answers: page only; launch in 2 weeks; hold for approval.*

## Phase 3 — Decompose & design

- M1 Research (parallel: competitors `standard`, positioning `deep`) → gate: none
- M2 Copy `standard` (depends on M1) → gate: review by @reviewer (brand voice)
- M3 Build `standard` + tests `basic` (depends on M2) → gate: review (functionality)
- M4 Stage & verify `basic` (depends on M3) → gate: HUMAN APPROVAL before go-live

Tiers default down: link checks and staging are `basic`, the judgment-heavy
positioning call is `deep`. The whole run is hands-free under elevated permissions,
stopping only on a high-level issue or the go-live gate.

Mode check: 4 milestones, none with more than 2 subtasks — at the threshold, not
over it, so the goal stays **fully inline** (no `PLAN FILE:` / lean-spine mode).

## Phase 4 — Emit the `/goal`

```
/goal [
  OUTCOME: A reviewed, on-brand Sneaker Panel Pro launch landing page, built and
           staged, awaiting one human approval to go live.

  SUCCESS CRITERIA:
    - Landing page renders and passes functional review on staging.
    - Copy approved against the sneaker-panel-pro brand voice and pillars.
    - Competitor positioning reflected in the page's value props.
    - Nothing is published without explicit human approval.

  CONSTRAINTS:
    - Brand voice/pillars/hard-rules from the sneaker-panel-pro marketing module.
    - Never publish without approval (repo hard rule).
    - Target launch window: 2 weeks out.

  ASSUMPTIONS:
    - Single landing page only (no social teasers this round).
    - Hold at staging for human go-live approval (no auto-publish).
    - Competitor set selected by the researcher.

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

    MILESTONE 1 — Research  [depends on: none]
      done when: brief lists 3+ competitors and a recommended value-prop angle.
      parallel subtasks:
        - [@researcher] (standard) Teardown 3+ competitor launch pages → competitor
          teardown | done when each has strengths/gaps + sources.
        - [@researcher] (deep) Position Sneaker Panel Pro vs. market → positioning
          brief | done when recommended angle is stated.
      gate: none

    MILESTONE 2 — Copy  [depends on: Milestone 1]
      done when: full page copy drafted to the outline.
      parallel subtasks:
        - [@content] (standard) Draft hero, value props, CTA from the positioning
          brief → page copy | done when all sections present and on-voice.
      gate: review by @reviewer (brand voice + pillars) — (deep)

    MILESTONE 3 — Build  [depends on: Milestone 2]
      done when: page builds and renders with approved copy.
      parallel subtasks:
        - [@coder] (standard) Build the page with approved copy → page in repo |
          done when it builds and renders locally.
        - [@tester] (basic) Add render/link checks → checks | done when passing.
      gate: review by @reviewer (functionality) — (standard)

    MILESTONE 4 — Stage & verify  [depends on: Milestone 3]
      done when: staged URL verified against SUCCESS CRITERIA.
      parallel subtasks:
        - [@devops] (basic) Deploy to staging → staged URL | done when reachable.
      gate: HUMAN APPROVAL before go-live.

  DELIVERABLES:
    - Staged landing page URL + the competitive/positioning brief, in the repo.

  ESCALATION:
    - If a review gate is rejected twice, or staging fails, pause and report the
      specific blocker with options.
]
```

**Summary for the user:** This goal researches competitors, writes on-brand copy
(reviewed for voice), builds and tests the page, stages it, and stops for your
go-live approval. It runs hands-free under elevated permissions and only stops on
a high-level issue or the go-live gate; simple steps (link checks, staging) run on
basic models to save cost. Assumptions: page only, hold-for-approval, 2-week
window — tell me to adjust any of these before launching.

### Run it headless

```bash
# Save the /goal block above to goal.txt, then run unattended:
claude -p "$(cat goal.txt)" \
  --permission-mode acceptEdits \   # auto-accept edits; HUMAN APPROVAL still pauses
  --output-format stream-json --verbose

# Fully unattended (trusted/sandboxed dir only — skips ALL prompts):
claude -p "$(cat goal.txt)" --dangerously-skip-permissions
```

`--dangerously-skip-permissions` bypasses every permission prompt — use it only in
a repo/dir you trust, and wire the HUMAN APPROVAL gate in yourself (e.g. stop the
run before go-live). `acceptEdits` is the safer middle ground. The Lead routes
per-subtask model tiers itself; pass `--model <id>` only to pin one tier for the
whole run.

*(Budget check: the `/goal` block above is ~3.5k characters — under the ≤3500
target, with headroom below the 4000 hard ceiling. It was built to budget:
canonical EXECUTION MODE + LEAD dropped in verbatim first, then the variable
sections (milestones are the main lever) filled to fit — not written long and
trimmed. The "Run it headless" section sits outside the block and doesn't count.)*
