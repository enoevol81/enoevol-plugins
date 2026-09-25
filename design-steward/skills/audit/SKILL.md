---
name: audit
description: >-
  Find which design decisions a project is actually committed to (colors, radius,
  spacing, typography, component styles), where each came from, how settled it is, and
  where sources conflict, with cited evidence. Use before a redesign or UI change, or
  when the user asks "what are our design rules", "why does X always look like this",
  "is this style settled", "can we change this without breaking something", or wants to
  know whether docs and code disagree.
---

# Audit

Read `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` first for shared artifacts and path resolution.

Read `${CLAUDE_PLUGIN_ROOT}/components/canon-check/skills/canon-check/SKILL.md` and `${CLAUDE_PLUGIN_ROOT}/components/canon-check/references/decision-contract.md`. Use the source snapshot before report reuse. Record scope and decision status separately from frequency. For a targeted request, inspect only the relevant category and consumers.

Write canon-report.md and sources.json to `.design-steward/<run-id>/` in the project, not the component's default `_canon-check/` directory.
