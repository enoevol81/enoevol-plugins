Audit done — full Canon Report written to `_canon-check/2026-07-10/canon-report.md` (scanned all 10 files, both commits, and every doc/token/artifact source).

**Why everything drifts back: your repo has two competing design systems, and the *old* one is the one all your durable documents describe.**

**The 3 conflicts that matter:**

1. **Accent color.** CLAUDE.md, README, `tailwind.config.js`, and `globals.css` all say blue `#3B82F6`. But your actual CTA (`Button.tsx`) uses indigo `#6366F1` — adopted from a March 2026 critic-layer change brief that said "*try* the indigo." The brief itself notes "Not yet reflected in tokens," and four months later it still isn't. So any pass that consults the docs (including AI agents reading CLAUDE.md) will "correct" things back to blue.

2. **Corner radius, three-way split.** Docs and both token files say 8px. `Button`, `Card`, and `IconButton` hardcode 6px. `Modal` alone still uses 8px. And here's the part you probably don't remember deciding — because you sort of didn't: **the 6px came from an AI-generated, explicitly dismissible, Priority-2 note** in that same change brief. The least-deliberate suggestion in the repo is now your majority radius.

3. **Tokens with zero consumers.** CLAUDE.md says "use the `accent` token, never hardcode" — but every component uses hardcoded inline styles, and *nothing* consumes the Tailwind theme or the CSS variables. Two parallel token systems, no subscribers. That's the structural reason drift went unnoticed: updating tokens changes nothing on screen.

**What's actually solid:** the 8px spacing grid and Inter — every source agrees, code included. Those are real canon.

**What's fragile (never actually decided):** the 6px radius, the 8px icon padding (one critic note), the `#E2E8F0` card border, all modal geometry, and the 14px button font size — each exists in exactly one place with no doc backing. You're free to change any of them.

**Document dispositions proposed in the report:** CLAUDE.md, README, and both token files are **stale** (update once you ratify indigo/6px or revert to blue/8px); the March change brief is **obsolete** — all items shipped, but it's the only written rationale for indigo and 6px, so promote its decisions into CLAUDE.md/tokens, then archive it. Sitting in `design/`, it reads as a live instruction.

Since the audit surfaced conflicts and stale docs, the natural next step is the companion **canon-update** skill — an interactive pass that realigns CLAUDE.md, README, and the token files to whichever direction you pick and settles each document's disposition. I haven't run it (updating canon is your call, and this session couldn't ask); say the word and it'll walk you through each decision.
