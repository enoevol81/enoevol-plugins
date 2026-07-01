# design-signal-scout

A design, technology, and cultural intelligence system for Hermes. Monitors
footwear, industrial/product design, 3D and visualization (Blender, CAD,
rendering), architecture, game development, and AI-assisted creative tooling —
then scores, clusters, and converts what it finds into content and product
opportunities.

## Skills

| Skill | Role |
| --- | --- |
| `source-manager` | Maintains the source network (feeds, channels, communities, repos) the rest of the system monitors. |
| `signal-scout` | Entry point — runs a scouting cycle, discovers and scores candidate signals, routes them onward. |
| `visual-trend-analyzer` | Reads images/video for form, material, color, and motif; judges trend stage. |
| `technology-radar` | Evaluates a tool or model: test-now, watch, adopt, or probably-hype. |
| `pain-point-miner` | Mines communities for repeated frustrations and maps them to product/content opportunities. |
| `trend-clusterer` | Groups related signals into named, momentum-tracked clusters. |
| `inspiration-curator` | Turns scattered references into a focused, usable inspiration set. |
| `content-opportunity-generator` | Converts a signal into a scored, concrete content idea. |
| `weekly-creative-brief` | Synthesizes the week's signals into one ranked, actionable report. |
| `signal-feedback-loop` | Learns from Matt's reactions to tune future scouting without overfitting. |

All nine skills share [`references/operating-model.md`](references/operating-model.md) —
the signal categories, priority scale, required signal-record schema, scoring
dimensions, default output format, and escalation/non-goal rules that keep
output consistent across skills.

## Install

```
/plugin marketplace add enoevol81/enoevol-plugins
/plugin install design-signal-scout@enoevol-plugins
```

## Notes for Hermes

- Store signals, sources, clusters, and feedback in a persistent structured
  store (database, notes vault, or structured files) — this system's value
  compounds only if records survive across sessions.
- Nothing here auto-publishes, auto-contacts, or takes purchase/account
  actions. Every skill requires explicit approval before those.
