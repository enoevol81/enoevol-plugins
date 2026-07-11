---
name: content-opportunity-generator
description: >-
  Translate a design/technology signal, trend cluster, tool release, pain
  point, or project milestone into a concrete, scored content idea — with
  audience, format, hook, proof, and call to action defined. Use this whenever
  the user wants content ideas, post/carousel/reel/tutorial concepts drawn from
  real signals, or asks "what could I post about X." Trigger proactively any
  time signal-scout, trend-clusterer, technology-radar, or pain-point-miner
  surfaces something with clear content potential — don't wait for the user to
  separately ask "turn this into content."
---

# Content Opportunity Generator

Read [../../references/operating-model.md](../../references/operating-model.md) first for the shared decision filter — content ideas here should still pass the revenue/leverage/goal/momentum test before being surfaced.

## Reads / Writes (workspace)
- **Reads:** `signals/` records and `clusters.md` entries being converted (work
  from the stored record when one exists, not from memory of it).
- **Writes:** a signal record (category `content_opportunity`, linking the source
  signal's `id`) appended to `signals/YYYY-MM-DD.md` for each idea scoring well.
- This skill produces the idea, not the copy. When the user moves to actually
  drafting the post, use the `personal-voice` plugin (if installed) so the final
  writing lands in Matt's voice.

## Objective
Translate design and technology signals into useful, timely content ideas.

## Inputs
- signal
- trend cluster
- tool release
- pain point
- project progress
- platform
- audience
- business goal

## Content Goals
Choose one:
- educate
- demonstrate expertise
- attract clients
- sell a product
- build authority
- document process
- start discussion
- test demand
- drive traffic
- support a launch

## Formats
Consider:
- short post
- carousel
- reel
- tutorial
- workflow breakdown
- case study
- comparison
- reaction
- design critique
- blog post
- newsletter
- YouTube video
- live test
- downloadable resource

## Process
1. Identify the useful insight.
2. Identify the audience.
3. Tie the topic to a real problem.
4. Choose the smallest effective format.
5. Define the hook.
6. Define proof or demonstration.
7. Define the call to action.
8. Estimate effort.
9. Score timing and relevance.

## Content Score
Score 0–5:

- audience relevance
- timeliness
- originality
- proof available
- business alignment
- production efficiency
- repurposing potential

Subtract for:
- generic topic
- weak evidence
- no visual proof
- trend chasing
- excessive production effort
- no connection to an offer

## Output
```markdown
# Content Opportunity: [Title]

**Signal:**
**Audience:**
**Goal:**
**Format:**
**Hook:**
**Core point:**
**Proof or demonstration:**
**Visuals needed:**
**Call to action:**
**Effort:** Low / Medium / High
**Timing:**
**Score:**
```

## Rules
- Do not create content solely because a topic is trending.
- Prefer demonstrations over opinions.
- Tie content to actual work, experiments, tools, or client problems.
- Reuse one strong signal across multiple formats when justified.
- Avoid empty engagement bait.
