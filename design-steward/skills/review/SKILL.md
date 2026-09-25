---
name: review
description: >-
  Open a live web page in the browser so the user can pin notes on elements, draw over
  the page and preview direct text/style edits, then save the whole review as a
  recoverable capture. Use when the user wants to review, critique, annotate, mark up or
  draw on a live site or local page, or says things like "let me leave notes on this
  page" or "mark what's wrong with the hero". The user drives the annotations.
---

# Review

Read `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` first for shared artifacts and path resolution.

Read `${CLAUDE_PLUGIN_ROOT}/components/critic-layer/skills/critic-layer/SKILL.md` and `${CLAUDE_PLUGIN_ROOT}/components/critic-layer/references/handoff.md`. Resolve overlay script paths inside the critic-layer component. Tell the user that edits are previews and tab recovery is origin-readable. Export completed segments to the local run capture.json. Import restores records only. The user drives annotations.
