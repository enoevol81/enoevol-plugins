---
name: weekly-creative-brief
description: >-
  Produce a concise weekly report — executive summary, top signals, visual
  trends, technology radar, community pain points, content opportunities,
  product/service opportunities, competitor movement, and ranked recommended
  actions — synthesized from everything the scouting system found in the last
  seven days. Use this whenever the user asks for a weekly brief, roundup,
  digest, or status report on design/tech scouting, or wants a single
  actionable document instead of a stream of individual signals. Trigger
  proactively at the end of a scouting cycle once enough signals, clusters, and
  pain points have accumulated to synthesize, even if the user just says
  "what's the state of things" or "give me the rundown."
---

# Weekly Creative Brief

Read [../../references/operating-model.md](../../references/operating-model.md) first — this skill synthesizes outputs from every other skill in the plugin, so it should rank and phrase things consistent with the shared operating model.

## Objective
Produce a concise weekly report of the most relevant design, technology, workflow, trend, and opportunity signals.

## Reads / Writes (workspace)
- **Reads:** `signals/` files from the reporting window, `clusters.md`,
  `preferences.md`, and the previous brief in `briefs/` (to note what changed
  since last week and avoid re-reporting unchanged signals).
- **Writes:** the finished brief to `briefs/YYYY-MM-DD.md` (dated by the period's
  end date), and flips included signals' `status` to `briefed`.
- No workspace or an empty week: build the brief from whatever the session
  produced, state which sections had no stored data behind them, and keep the
  template intact so the brief still compares to future weeks.

## Reporting Window
Default to the previous seven days (or since the last brief in `briefs/`,
whichever the user prefers).

## Ranking
Within every section, rank by:
1. business relevance
2. strategic leverage
3. creative value
4. urgency
5. evidence quality

## Output Template (exact — use these ten sections, in this order, every week)
Keep every section heading even when a section is empty; write
`Nothing material this week.` under it so briefs stay comparable week over week.

```markdown
# Weekly Creative Intelligence Brief
**Period:** YYYY-MM-DD to YYYY-MM-DD
**Signals reviewed:** N (from signals/), **Clusters active:** N

## 1. Executive Summary
Maximum five sentences. What mattered, what changed since last week, what to do first.

## 2. Top Signals
Up to five, ranked. For each:
### 2.N [Signal title] — Priority X/5
- **What happened:** one factual sentence, with date and link.
- **Why it matters:** one interpretive sentence.
- **Evidence:** sources (linked).
- **Recommended action:** one concrete step.

## 3. Visual Trends
Up to three. For each: **[Cluster name]** — stage, momentum, one-line evidence,
relevance to current work, one experiment to run.

## 4. Technology Radar
- **Test now:** tool — why, and the one-line test.
- **Watch:** tool — what would change its status.
- **Skip / probably hype:** tool — why.

## 5. Community Pain Points
Up to three. For each: **[Problem]** — who has it, evidence count, current
workaround, possible response.

## 6. Content Opportunities
The three strongest. For each: **[Title]** — format, hook, proof available, timing.

## 7. Product or Service Opportunities
Only opportunities with meaningful evidence. For each: **[Opportunity]** —
underlying pain point, evidence, smallest viable version.

## 8. Competitor and Market Movement
Material changes only, each with a date and link.

## 9. Recommended Actions
Ranked, maximum five, numbered:
1. **[Action]** — owner: Matt/Hermes · effort: S/M/L · expected value: one phrase · when: this week / this month / when X happens

## 10. Noise Filter
What looked important but was excluded, and why (one line each).
```

## Rules
- Keep the brief below 1,500 words unless requested otherwise.
- Do not pad thin sections — `Nothing material this week.` is a complete entry.
- Every signal, trend, and market item carries a link and a date.
- Do not repeat the same signal in multiple sections without adding new meaning.
- End with actions, not observations.
- After delivering the brief, suggest running `signal-feedback-loop` on Matt's
  reactions to it.
