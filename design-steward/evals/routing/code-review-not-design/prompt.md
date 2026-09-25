---
description: Not a design-steward task; no plugin skill should load.
tags: [routing]
max_turns: 4
timeout_seconds: 180
allowed_tools: [Read, Glob, Grep, Skill]
---

Review this function for bugs before I merge it:

    def average(xs):
        return sum(xs) / len(xs)
