---
name: cleanup
description: >-
  Find and safely remove leftover development clutter (old plans, scratch notes, stale
  agent files, superseded docs, unused experiments) with a review of each item and a
  recoverable archive outside the project. Use when the user says the repo is cluttered,
  asks what can be safely deleted, wants to clean up agent or dev leftovers, or wants to
  retire outdated documents. Audit mode changes nothing; cleanup mode acts only on
  groups the user approves.
---

# Cleanup with Cut Weight

Read `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` and
`${CLAUDE_PLUGIN_ROOT}/components/cut-weight/skills/cut-weight/SKILL.md`.
Resolve all Cut Weight references and its inventory script inside that bundled
component: its `references/...` and `scripts/...` links are relative to
`${CLAUDE_PLUGIN_ROOT}/components/cut-weight/skills/cut-weight/`. It is included here; no separate plugin installation is required.

Preserve the requested mode: audit makes no project changes; cleanup executes
authorized groups; aggressive remains within the same operational protections.
Carry forward explicit user decisions from the design workflow. Unresolved
directions remain ASK; neither a completed review nor age authorizes removal.

Read the component's `references/workflow-handoff.md` for run artifacts. Keep
current decision authority, unresolved findings, active ledgers and evidence
needed by their acceptance checks. Consolidate useful knowledge before archiving
superseded runs. Audit and recovery artifacts go in the external graveyard, not
the normal `.design-steward/` output directory. Leave only a concise recovery
pointer in the existing run record when applicable; never copy archive payloads
into the project. Verify copies, hashes, reference repairs and coverage before
reporting cleanup complete. No automatic purge or feature retirement.
