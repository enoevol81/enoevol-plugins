---
name: align
description: >-
  Update a project's design documentation (DESIGN.md, CLAUDE.md, AGENTS.md, style
  guides, token files) to match a design decision the user has made. Use when the user
  says they've decided on a new style or standard, asks to make docs match the current
  direction, says the docs or project instructions are stale or describe an old style,
  or wants conflicts from a design audit resolved in the docs. Preserves scoped
  exceptions and unresolved conflicts.
---

# Align

Read `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` first for shared artifacts and path resolution.

Read `${CLAUDE_PLUGIN_ROOT}/components/canon-check/skills/canon-update/SKILL.md` and `${CLAUDE_PLUGIN_ROOT}/components/canon-check/references/decision-contract.md`. Recheck source freshness, carry forward existing authorization, and group unanswered decisions. Record decisions.json with scope and authority. Edit only affected guidance and keep history truthful.

Write decisions.json and any refreshed report to `.design-steward/<run-id>/` in the project, not the component's default `_canon-check/` directory.

Cut Weight is included in this package. For authorized document retirement, use
the cleanup skill and bundled `${CLAUDE_PLUGIN_ROOT}/components/cut-weight/skills/cut-weight/SKILL.md`.
Its external graveyard contract takes precedence over the standalone fallback
retired/ directory. Keep unresolved findings and current run evidence intact.
