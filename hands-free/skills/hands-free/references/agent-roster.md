# Skilled Sub-Agent Roster

The Lead orchestration agent deploys sub-agents by **skill role**. These roles
mirror Mission Control's agent roles (`coder`, `reviewer`, `tester`, `devops`,
`researcher`, `assistant`) plus the marketing/content pipeline. Reference an
agent in a `/goal` subtask with `[@<skill>]`.

## Roles

| `@skill`       | Specialty                                                        | Typical artifacts |
|----------------|------------------------------------------------------------------|-------------------|
| `@researcher`  | Web research, source verification, competitive & market analysis | findings brief, cited sources, options matrix |
| `@coder`       | Full-stack implementation, APIs, scripts, data models            | code, endpoints, migrations, configs |
| `@tester`      | Test authoring, verification, regression checks                  | test suites, pass/fail report, repro steps |
| `@reviewer`    | Quality gate (Aegis-style) — correctness, completeness, voice    | APPROVED/REJECTED verdict + notes |
| `@devops`      | Build, deploy, CI/CD, infra, scheduling/cron                     | pipelines, deploy logs, cron jobs |
| `@content`     | Marketing copy & per-platform drafts within brand voice/pillars  | draft copy per platform, content items |
| `@assistant`   | Coordination, summarization, scheduling, inbox/triage glue       | summaries, schedules, handoff notes |

## Parallelization rules

1. **Same milestone = no dependencies between its subtasks.** If subtask B needs
   B's input from subtask A, A and B belong to *different* milestones.
2. **Fan out by independence, not by role.** Two `@researcher` subtasks on
   different topics can run in parallel; one `@researcher` feeding one `@coder`
   cannot.
3. **Reviewer is a gate, not a rib.** `@reviewer` runs *after* a milestone's
   producing subtasks complete, as the milestone `gate` — not concurrently with
   the work it reviews.
4. **Cap concurrency to the real fan-out.** Don't manufacture parallel subtasks
   to look busy; only split work that is genuinely independent.
5. **Minimal context per agent.** Each sub-agent is deployed fresh and gets only
   what its subtask needs — the subtask itself, the named input artifact(s) from
   upstream milestones, and the constraints that bind it. Do **not** forward the
   main-window conversation or unrelated milestone output. Less context = fewer
   tokens, faster runs, and tighter, on-task results.

## Mapping outcomes to roles (heuristics)

- "research / compare / find out / what's the best…" → `@researcher`
- "build / implement / wire up / add endpoint / script" → `@coder`
- "make sure it works / verify / cover with tests" → `@tester`
- "check quality / sign off / on-brand?" → `@reviewer` (as a gate)
- "deploy / ship / schedule / automate the run" → `@devops`
- "write the post / draft the email / campaign copy" → `@content`
- "summarize / coordinate / book / triage" → `@assistant`

## Model routing note

The orchestrator (or Mission Control auto-dispatch) selects model tiers per
subtask: complex/diagnostic/architectural work → Opus; routine formatting/
summarizing → Haiku; otherwise the agent's default. You do not need to specify
models in the `/goal` — the Lead handles routing — but flag a subtask as
`(complex)` or `(routine)` in its description if the tier is non-obvious.
