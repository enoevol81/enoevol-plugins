---
name: verify
description: >-
  Check that implemented design changes actually fixed each reported issue, at the
  requested screen sizes, with before/after evidence. Use when the user has made or
  received UI fixes and asks to verify, confirm, test or check them against the original
  review, issue list or acceptance criteria, including specific viewports such as 390px
  mobile and 1280px desktop.
---

# Verify

Read `${CLAUDE_PLUGIN_ROOT}/references/workflow.md` first for shared artifacts and path resolution.

Read `${CLAUDE_PLUGIN_ROOT}/components/critic-layer/skills/verify/SKILL.md`. Match every check to the original issue and viewport. Save before/after evidence, exercise relevant behavior, and mark unavailable visual checks open. Refresh affected canon findings and the source baseline only after verifying changes. Report implemented-but-unverified issues explicitly.
