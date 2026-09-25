---
name: execute
description: >-
  Implement approved design or UI changes from a brief, plan or decision record, keeping
  a resumable progress log with evidence for each step. Use when the user asks to
  implement, apply, build or carry out reviewed changes, work through a brief.md or
  plan, run a multi-step change they may need to pause, or resume/continue an
  interrupted implementation run. Plan, run and resume modes.
---

# Execute

Read `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` first for shared artifacts and path resolution.

Choose the requested mode: plan, run, or resume. Read `${CLAUDE_PLUGIN_ROOT}/components/hands-free/references/execution.md` and the corresponding hands-free, execute or resume skill under `${CLAUDE_PLUGIN_ROOT}/components/hands-free/skills/`. Use `${CLAUDE_PLUGIN_ROOT}/scripts/run_state.py` and a `.design-steward/<run-id>/` run directory. Implement only the scoped brief and settled decisions. Available single-agent execution is sufficient; never assume special roles or elevated permissions. On interruption, check source/evidence freshness before resuming. Completion requires acceptance evidence.
