---
name: resume
description: Resume an interrupted Hands Free run from its saved plan and evidence, detecting stale completed steps before continuing.
---

# Resume a run

Read `../../references/execution.md`. Locate the user-selected run under
`.hands-free/<run-id>/` (or `.design-steward/<run-id>/` in the curated package).
If multiple incomplete runs exist and context does not identify one, ask which.

Run `run_state.py status <ledger>` first. Inspect recorded evidence and source
changes since the last run; hashes only cover recorded evidence files. Run
`run_state.py resume <ledger>` to reset interrupted/blocked steps and invalidate
completed steps with changed evidence, including their dependent steps.
Never replay external actions just because a run was interrupted: verify whether
they already happened. Preserve user changes and previous approvals within scope.
Continue with the execute skill at the first incomplete dependency-ready step.
