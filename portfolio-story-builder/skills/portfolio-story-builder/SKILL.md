---
name: portfolio-story-builder
description: >-
  Audit and organize a folder of design/creative work, and optionally turn it
  into ranked, documented portfolio stories and a slide deck. Works in two
  modes. Use the ORGANIZE mode whenever the user wants to make sense of a body
  of work — "organize my folder," "ingest this repository and suggest how to
  group it," "help me sort through my projects," "what's even in here" — and
  deliver a grouping/structure proposal as a finished result on its own. Use the
  BUILD mode when the user wants portfolio case studies, to document their design
  process or workflow, to rank which projects are portfolio-worthy, or to turn
  the work into a presentable deck. Trigger even when the user doesn't say
  "case study" or "deck": "build my portfolio," "document my work," "I've got a
  folder of projects I need to organize," and "I'm bad at writing up what I did"
  all point here. Especially relevant for product, footwear, fashion, industrial,
  3D, and tool/software designers whose work is mostly visual and whose process
  notes are thin.
---

# Portfolio Story Builder

This skill makes sense of a body of visual work. It runs in two stages, and
**Stage A is a complete deliverable on its own** — most of the time someone just
wants their folder organized and grouped, not a finished deck. Stage B builds on
Stage A only when the user wants stories and slides.

- **Stage A — Organize.** Ingest the folder, verify what every asset actually
  is, and propose how to group and structure it. Stop here unless the user wants
  more.
- **Stage B — Build stories.** Rank the groups, edit them, excavate the missing
  narrative, and construct a slide deck. Builds on Stage A.

The guiding principle throughout: **the assets are evidence, not the story.** A
render shows what was made; it doesn't explain the brief, the constraint, the
decision, or the outcome. Those live in the designer's head, and the
highest-value thing this skill does (in Stage B) is pull them out through
targeted questions rather than inventing plausible-sounding fiction. Never
fabricate outcomes, clients, or specs.

## Which stage does the user want?

- "Organize / sort / group / clean up / make sense of / what's in this folder"
  → run **Stage A** and deliver the proposal. Don't build a deck unless asked.
- "Build my portfolio / case studies / a deck / document this project"
  → run **Stage A**, then **Stage B**.
- Folder is already organized and they ask to "build the deck for project X"
  → you can jump to **Stage B** for that project.

When unsure, do Stage A and ask before continuing to Stage B. Stage A is cheap,
useful on its own, and the right foundation either way.

---

# Stage A — Organize

Goal: an accurate map of what's in the folder and a concrete proposal for how to
group and structure it.

## A1 — Audit

For a **medium or large/messy** repository, run the inventory script so machine
time does the boring part:

```bash
python3 scripts/inventory.py <portfolio_folder> --out manifest.json
```

It walks the tree, classifies every file, pulls image dimensions, and clusters
near-duplicate images. Read the printed summary.

Then **build a verified content map — this is the step that everything else
depends on, so do not skip or rush it.** Filenames in a portfolio folder are
usually meaningless (`Screenshot_2025-10-21_161503.png`, `final_v3_REAL.png`),
and the order files happen to sit in tells you nothing either. The only reliable
way to know what an asset is, is to look at it:

```bash
python3 scripts/contact_sheet.py <portfolio_folder>
```

This writes labeled thumbnail sheets (`sheet_01.jpg`, ...). `view` each sheet and
record, for every file, what it *actually* is — not what its name implies. For a
handful of key assets, also `view` the full-resolution file to read detail.
**Mislabeling an asset here poisons every grouping, ranking, and slide
downstream** — a wrong map is worse than no map, because it looks confident. If
your read of a file conflicts with its name, trust the picture.

The filename-based "looks final" hint in the manifest is only a weak nudge;
your visual read decides what an asset is and how good it is.

## A2 — Group

Folders are the user's implicit project boundaries — start there as a hypothesis,
but refine against what you actually saw. One folder may hold two projects; one
project may be split across folders; loose files may belong somewhere specific.

Within each project, sort assets by **story role**: concept/reference,
process/WIP, craft/detail, final/hero, in-context. This sorting is what later
makes a slide sequence fall out naturally, and on its own it tells the user what
each project has and lacks.

## A3 — Deliver the Organization Proposal

This is the Stage A deliverable. Present, clearly and concisely:

1. **Inventory recap** — counts, file types, candidate project count.
2. **Verified content map** — what each asset actually is (grouped, not a raw
   file dump).
3. **Grouping suggestions** — the proposed projects/clusters, and within each,
   the story-role breakdown.
4. **Suggested structure** — a clean folder layout and a rename scheme that
   replaces meaningless names with legible ones (e.g.
   `SneakerPanelPro/04_engine/geometry-nodes-graph.png`).
5. **Duplicates / near-twins** — flag them for the user to prune.
6. **Gaps** — per group, what's missing (e.g. "finals but no process," "no
   in-context shot").

**Acting on the proposal — safety:** propose first; only reorganize files if the
user explicitly says to. When executing, prefer **non-destructive** moves —
build the organized structure as copies in a new tree, or hand the user a script
they run themselves — and **never delete anything.** Duplicates are *flagged for
the user to remove*, never auto-deleted.

Stop here unless the user wants Stage B.

---

# Stage B — Build stories (optional)

Builds on the Stage A grouping. Don't start B until the content map and groups
exist.

## B1 — Rank

Read `references/case-study-reference.md` for the rubric. Score each project on
visual strength, story completeness, distinctiveness, skill demonstration, and
relevance — then **present a ranking as a proposal, with one-line reasoning per
project, and let the user arbitrate.** This is subjective; your job is a
well-reasoned starting point, not a verdict. Expect overrides and welcome them.

## B2 — Edit

For the projects making the cut: cull the weak and duplicate assets, pick the
hero image, and sequence the rest. Then do two things that need the user:

1. **The gap interview** — ask the small set of questions needed to complete each
   story's arc (brief, role, a key decision, outcome). See the reference. Batch
   them, keep them concrete, use the answers rather than guessing.
2. **The asset gap list** — name what's missing visually as a concrete,
   prioritized shot/render list, so the user knows exactly what to capture.

## B3 — Construct

Read `references/deck-spec.md` for the slide structure and design direction, and
read the `pptx` skill for how to actually build the file — that skill owns
construction (layouts, fonts, image placement, saving); don't reinvent it.

Per project, build a tight 4–6 slide sequence following the arc; order projects
by the approved ranking. Put the spoken narrative into **speaker notes** so the
slides stay visual *and* the deck doubles as the written workflow documentation
the user was missing. Pull the user's real brand tokens (colors, type, any
existing brand system) rather than inventing a generic look; only fall back to a
clean neutral system if none exist, and say so.

A project can be a physical product *or* a tool, app, or software — the "craft"
section means **whatever the core expertise is**: CMF and construction for a
shoe, engineering/UX/architecture for a tool. Don't force a physical-product
frame onto a software project.

---

## The visual bridge (when files aren't enough)

Default to **native viewing** of local files — it's the fastest way to ingest
visual work and needs no automation. Reach for a browser bridge (Claude in
Chrome) only in the one case it's actually warranted: when the canonical version
of the work lives on a **live site** (e.g. a Webflow portfolio, an online
lookbook) where the rendered layout itself is part of what must be read, and the
underlying files aren't available. For a folder of files, never reach for browser
automation — it's slower and more fragile than just looking.

## Reference files

- `scripts/inventory.py` — mechanical audit pass. Run first in Stage A.
- `scripts/contact_sheet.py` — labeled thumbnail sheets for the verified content
  map. Run in Stage A, then view the sheets.
- `references/case-study-reference.md` — story arc, ranking rubric, gap
  interview. Read in Stage B.
- `references/deck-spec.md` — per-project slide sequence and design direction.
  Read in Stage B, with the `pptx` skill.
