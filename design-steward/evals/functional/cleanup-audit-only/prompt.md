---
description: Audit-only cleanup must identify residue and change nothing in the project.
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit]
---

Audit this repo for leftover agent/dev residue. Audit only - don't change or move anything.
