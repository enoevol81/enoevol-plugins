# Swiss Design (Claude Code plugin)

Apply **Swiss / International Typographic Style** design discipline to any visual work —
posters, editorial spreads, slide decks, UI screens, landing pages, brand collateral, social
graphics, or any composition where **type and space carry the message**.

Swiss design is not a visual style — it's a **system for organizing information**. Every
decision answers one question: *does this improve communication?* If not, it goes.

The skill gives Claude:

- **Two modes with distinct outputs** — **MAKING** (a Layout Spec: grid numbers, type ladder,
  placement map, plus CSS for web targets) and **REVIEWING** (a Review Report: gate verdict
  with evidence, highest-leverage fix first, ranked concrete fixes).
- **Grid construction with real numbers** — baseline unit → margins → columns → gutters →
  modules, with default specs for web pages, 16:9 slides, social crops, and A2 posters, and
  worked derivations in the reference.
- **Swiss type-scale discipline** — few sizes, big jumps (≥1.5× between levels, display at
  3–8× body), ≤2 typefaces, ≤3 weights, zero type effects.
- The **nine tenets** — grid systems, alignment, hierarchy, typography first, asymmetrical
  balance, contrast, white space, consistency, restraint — with full rationale and failure
  patterns in the long-form reference.
- A hard **nine-check approval gate** — each check has an objective pass test *and* a stated
  failure action; nothing ships until all nine pass.
- A **dense-content playbook** — what to do when tables, legal text, or dashboards resist
  reduction, and an explicit call on **when Swiss is the wrong answer**.
- An **annotated canon** — canonical Swiss works (the *beethoven* Tonhalle poster,
  *die Zeitung*, the Helvetica study, and more) with, for each, exactly what to imitate:
  grid structure, scale contrast, spatial division. Claude can open the images to look.

It triggers automatically on design-shaped requests — "lay this out," "spec a grid," "make
this cleaner," "fix the hierarchy," "design a poster," "this feels cluttered," "critique my
layout," "review this screenshot" — or any modernist / flat / minimal / grid-based /
Helvetica-adjacent direction, even when nobody says "Swiss."

## Install

Distributed via the [enoevol-plugins](https://github.com/enoevol81/enoevol-plugins)
marketplace.

```bash
# 1. Add the marketplace
/plugin marketplace add enoevol81/enoevol-plugins

# 2. Install the plugin
/plugin install swiss-design@enoevol-plugins
```

## Use

Just ask for layout or design help, or hand Claude a composition to critique:

> "Lay out this concert poster — headline, three supporting lines, a date."
> "Spec a 12-column grid and type scale for the landing page, then write the CSS."
> "This slide feels cluttered. Make it cleaner."
> "Here's a screenshot of my hero section — review it against Swiss principles."

In MAKING mode the skill builds the grid first (with numbers), sets a type ladder with real
jumps, places by hierarchy, and runs the nine-check gate before calling anything finished.
In REVIEWING mode it reconstructs the implied grid, walks the gate with evidence from the
artifact, and leads with the single highest-leverage fix.

## What's in the box

```
swiss-design/
├── .claude-plugin/plugin.json
└── skills/swiss-design/
    ├── SKILL.md                         # operational layer: modes, workflow, grid math, the gate
    ├── references/
    │   └── principles-full.md           # depth layer: rationale, failure patterns, worked grid constructions
    └── assets/references/               # annotated canon: one exemplar per principle
        ├── INDEX.md                     # per-work "what to imitate" notes + attributions
        ├── 00-overview-*.{jpeg,webp}    # grid-as-design / appropriation / geometric color
        ├── 01-grid-layout-levels.webp
        ├── 02-alignment-vision.jpeg
        ├── 03-hierarchy-helvetica.jpeg
        ├── 04-typography-beethoven.jpeg
        ├── 05-asymmetry-die-zeitung.jpeg
        ├── 06-contrast-grid-templates.jpeg
        ├── 07-whitespace-velvet.jpeg
        ├── 08-consistency-wireframes.webp
        └── 09-restraint-swiss-white.jpeg
```

## Note on the references

The images are **study references, not assets to reproduce** in deliverables — use them to
calibrate the eye, then build original work. Attributions in `INDEX.md` are best-effort from
the source material; treat the *principle* each image teaches as the reliable part, not the
provenance.

## Works with the Enoevol / Vanish system

The skill is style-agnostic, but the tenets map cleanly onto the Enoevol/Vanish tokens (Inter
+ Geist Mono, flat with `border-radius: 0`, coral `#ff5b45` as the single accent) without
overriding them. See the closing section of `SKILL.md`.

## License

MIT © Matthew Cohen
