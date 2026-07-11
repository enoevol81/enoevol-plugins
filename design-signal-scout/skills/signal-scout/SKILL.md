---
name: signal-scout
description: >-
  Run a scouting cycle to discover high-value design and technology signals
  across footwear, industrial/product design, 3D and visualization, CAD,
  Blender, architecture, game development, and AI-assisted creative tooling.
  Use this whenever the user asks to scout, search for, or round up what's
  happening in design/tech right now; wants emerging visual language, new
  tools, or workflow shifts; or is starting a scouting cycle for content or
  product opportunities. Trigger proactively for asks like "what's new in
  [domain]," "find me signals on X," or "scan for anything interesting in
  footwear/3D/Blender/creative AI this week" — this is the entry point most
  other skills in this plugin (visual-trend-analyzer, technology-radar,
  pain-point-miner) feed into.
---

# Design Signal Scout

Read [../../references/operating-model.md](../../references/operating-model.md) first for the shared workspace, signal categories, the required signal record, the canonical scoring rubric, and web/freshness discipline.

## Objective
Discover high-value design and technology signals relevant to footwear, product design, 3D, visualization, architecture, games, and creative tools.

## Reads / Writes (workspace)
- **Reads:** `sources.md` (what to search), `preferences.md` (topic/source weights), recent `signals/` files (to deduplicate against prior finds).
- **Writes:** new signal records appended to `signals/YYYY-MM-DD.md`, each with `status: new` (or `routed` if handed to another skill).
- If the workspace doesn't exist, offer to create it; if declined, run session-only and say so.

## Trigger
Use this skill when:
- running a scheduled scouting cycle
- researching a new design direction
- looking for emerging visual language
- tracking tools or workflows
- searching for content or product opportunities

## Search Themes
Monitor:

### Design
- footwear design
- industrial design
- product design
- CMF
- materials
- manufacturing
- design systems
- form language
- speculative design
- digital fashion
- architecture
- interiors
- transportation
- packaging

### 3D and Visualization
- Blender
- procedural modeling
- geometry nodes
- CAD
- Plasticity
- Rhino
- Unreal Engine
- Substance
- rendering
- motion design
- photogrammetry
- Gaussian splatting
- neural rendering
- 3D generation

### Technology
- creative AI
- multimodal models
- image generation
- video generation
- agentic workflows
- automation
- design software
- open-source tools
- creative coding
- digital fabrication

## Process
1. Load `sources.md` and `preferences.md`; weight search themes accordingly.
2. Generate broad and narrow searches, preferring recent windows (past 7–30 days).
3. Search primary and specialist sources.
4. Collect candidate signals with `published_at` and `discovered_at` dates.
5. Deduplicate — against this run and against recent `signals/` files.
6. Verify material claims against a second independent source.
7. Classify and score per the operating model's canonical rubric.
8. Append surviving records to `signals/YYYY-MM-DD.md`.
9. Suggest routing where deeper analysis is warranted — `visual-trend-analyzer`
   for imagery/motifs, `technology-radar` for tools, `pain-point-miner` for
   community complaints, `trend-clusterer` once several related signals exist,
   `content-opportunity-generator` when something is clearly postable.

## Discovery Queries
Use query patterns such as:

```text
new workflow for [domain]
recent open source [tool category]
designers discussing [pain point]
emerging material in [industry]
new Blender add-on for [task]
site:github.com [workflow]
site:reddit.com [pain point]
"how do I" [design task]
"wish there was" [design tool]
"takes forever" [workflow]
"new release" [software]
```

## Signal Threshold
Surface a candidate only when at least one is true:
- directly relevant to current work
- repeated across multiple independent sources
- unusually novel
- commercially actionable
- likely to become content
- likely to save meaningful time
- likely to create a product or service opportunity

## Scoring
Use the canonical rubric in the operating model — eight dimensions scored 0–5,
summed to a 0–40 composite, minus penalties, mapped to the archive → immediate-alert
bands defined there. Do not invent a local variant.

## Output
For each selected signal:

```markdown
## [Signal]

**Category:**
**Source:**
**Observed:**
**Interpretation:**
**Why it matters:**
**Evidence strength:**
**Momentum:**
**Potential use:**
**Recommended action:**
**Score:**
```

## Rules
- Do not call something a trend based on one source.
- Do not summarize obvious mainstream news unless it changes strategy.
- Prefer original projects, repositories, papers, demos, and creator posts.
- Surface counter-signals when evidence conflicts.
- Mark speculative conclusions clearly.
- No web access: scout only what the user provides, and say the run was offline.
- Thin week: report the thinness honestly instead of padding to a quota.
