---
name: execute
description: Execute an authorized plan with durable progress, dependency checks and completion evidence. Use when asked to run a Hands Free plan or carry a multi-step outcome to completion.
---

# Execute a plan

Read `../../references/execution.md`. Respect the user's existing scope and authorization.
Discover available tools and agents; do not assume Mission Control, model routing,
parallel agents, a /goal command, or elevated permissions exist. A single agent
can perform the whole plan. Never change permission settings to make a plan run.

1. Read the plan and existing ledger. For a new run, create a plan in the schema
   below, then initialize it with the bundled `scripts/run_state.py` at the plugin root.
2. Recheck source state, dependencies, authorization and relevant constraints.
3. Mark the next step running. Execute only its scope. Parallel work is optional
   when available and authorized, with non-overlapping ownership.
4. Verify the step's acceptance criteria using real outputs. Save a short evidence
   artifact including the command/check, outcome, affected files, and limitations.
5. Complete the step with evidence and observed result. The ledger checks file
   existence and hashes, not whether a claim is true; you must evaluate the result.
6. On failure, diagnose and retry once if safe. Otherwise record the blocker and
   exact next action. Stop only dependent work; continue independent authorized work.
7. Report completion only after all acceptance criteria are checked. Distinguish
   fixture tests, source implementation, browser verification, and publication.

Budget fields are advisory unless a real host control enforces them. Text-length
validation is not spending, token, runtime, or permission enforcement.
