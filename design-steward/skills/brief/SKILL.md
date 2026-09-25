---
name: brief
description: >-
  Turn a saved page review (capture.json or exported notes) into a clear list of issues
  with stable IDs, likely source files and acceptance criteria, ready to hand to a
  coding agent. Use when the user has review notes or an exported capture and wants an
  issue list, change brief, implementation prompt or acceptance criteria. Works without
  a browser.
---

# Brief

Read `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` first for shared artifacts and path resolution.

Read `${CLAUDE_PLUGIN_ROOT}/components/critic-layer/skills/brief/SKILL.md`. Preserve session-qualified issue IDs. Run the `${CLAUDE_PLUGIN_ROOT}/scripts/source_candidates.py` helper, inspect candidates and keep uncertainty explicit. Produce a consistent brief and implementation prompt. Proposed changes are not automatically approved standards.
