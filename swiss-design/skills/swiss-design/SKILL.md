---
name: swiss-design
description: >-
  Apply Swiss / International Typographic Style design discipline to any visual
  work — grid construction with real numbers, typographic hierarchy, layout
  critique, and ruthless reduction. Use this skill WHENEVER making or reviewing
  visual design decisions — posters, editorial spreads, slide decks, UI screens,
  landing pages, brand collateral, social graphics, or any composition where type
  and space carry the message. Covers both directions: MAKING (spec a grid, pick a
  type scale, produce layout specs or CSS) and REVIEWING (critique a screenshot,
  mockup, or described layout against an approval gate). Trigger even when the
  user doesn't say "Swiss" — phrases like "lay this out," "make this cleaner,"
  "fix the hierarchy," "spec a grid," "design a poster/spread/slide/page," "this
  feels cluttered," "critique my layout," "review this screenshot," or any
  modernist / flat / minimal / grid-based / Helvetica-adjacent direction all point
  here. Also applies to dense content (tables, legal text, dashboards) that needs
  order without losing information. Do NOT use for illustration, photography
  retouching, or maximalist/decorative styles where the brief explicitly wants
  ornament.
---

# Swiss Design

Swiss design is not a visual style — it is a **system for organizing information**. The objective is clarity, hierarchy, objectivity, and the reduction of noise. Every decision answers one question: *does this improve communication?* If not, it goes.

**First, check the brief fits.** Swiss is the wrong tool when the brief wants ornament, expressive illustration, period pastiche, or a brand whose equity is maximalist warmth. Say so plainly and offer the transferable parts (grid, hierarchy) à la carte instead of forcing the full idiom.

**Then pick a mode.** This skill runs in two directions with different outputs:

| Mode | Trigger | Output |
|---|---|---|
| **MAKING** | "design / lay out / spec / build" | A **Layout Spec** (grid numbers, type scale, placement), plus CSS when the target is web |
| **REVIEWING** | "critique / review / why does this feel off" + a screenshot, file, or description | A **Review Report** (gate verdict with evidence, highest-leverage fix first) |

Scope note: this skill judges **composition** — grid, type, hierarchy, space. It is not a UX flow walkthrough or a brand-canon audit; stay on the layout.

## MAKING — workflow (apply in order)

### 1. Inventory and rank the content

List every element the layout must hold, then rank: **one** dominant message, **one** supporting message, everything else secondary. If the user hasn't ranked, propose a ranking and confirm. No layout decisions before this exists.

### 2. Build the grid first — with numbers

Never place an element before the invisible structure exists. Construct in this order:

1. **Baseline unit.** Web/UI: `8px`. Print: the body text leading (e.g. 9pt type / 12pt leading → 12pt unit). Every vertical measure — line-heights, spacing, row heights — is a whole multiple of this unit.
2. **Margins.** Set before columns. Generous: web ≥ 3× gutter; print ≥ 15mm, bottom margin larger than top. Nothing ever touches a margin.
3. **Columns.** Choose from content, not habit: posters 3–6, web pages and 16:9 slides 12, social crops 4–6, editorial spreads 6 or 12. More columns = more placement options, not more clutter.
4. **Gutter.** 1–2 baseline units (web: 16–32px; print: one line of body leading).
5. **Rows (optional but Swiss).** Divide the height into modules a whole number of baselines tall, one blank baseline between modules — this is the Müller-Brockmann modular grid.

Default target specs (adjust, don't ignore):

| Target | Frame | Grid | Gutter | Margins | Baseline |
|---|---|---|---|---|---|
| Web page | 1200–1440px container | 12 col | 24px | 72–96px | 8px |
| Slide 16:9 | 1920×1080 | 12 col | 32px | 96px | 8px |
| Social 1:1 / 4:5 / 9:16 | 1080 wide | 4–6 col | 24–32px | 72–96px | 8px |
| Poster A2 | 420×594mm | 4–6 col | 1 body leading | ≥20mm, bottom largest | body leading |

For web, express the grid as CSS so it's enforceable:

```css
.page { max-width: 1200px; margin-inline: auto; padding-inline: 96px; }
.grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px; }
/* all vertical rhythm from one ladder: */
:root { --u: 8px; } /* spacing values: calc(var(--u) * {1,2,3,4,6,8,12}) only */
```

### 3. Set the type scale — few sizes, big jumps

Swiss hierarchy uses **large, obvious steps**, not a smooth ramp. Adjacent levels differ by ≥1.5×; display sits at 3–8× body.

- **Levels:** 3–4 sizes total is normal; 2 can be enough. Example web ladder: `13px` meta → `16px` body → `24–32px` subhead → `64–128px` display. Slides: `24–32` body, `80–120` title. Social at 1080 wide: body ≥ `32px`, display ≥ `120px`.
- **Faces:** ≤ 2 typefaces, ≤ 3 weights, sans-serif first (Helvetica, Univers, Akzidenz; modern: Inter, Neue Haas). Weight steps are full jumps (Regular → Bold), never adjacent grades.
- **No effects.** No shadows, outlines, gradients on type. Reach for scale, weight, and position instead — always.
- Body measure 45–75 characters; line-height a baseline multiple (web body: 24px on 16px type).

### 4. Place by hierarchy, aligned to the grid

Dominant message first, then supporting, then secondary. Every element's edge lands on a column boundary; every vertical position on a baseline. No floating objects. Flush-left, ragged-right by default; break the grid only once and only on purpose.

### 5. Balance asymmetrically

Put the dominant mass off-center and counter it with whitespace, not with a mirrored twin. Avoid reflexive centering — a centered layout must be argued for, not defaulted to.

### 6. Cut, then run the gate

Remove every element that doesn't improve communication. Then run **The Gate** (below). Deliver as a **Layout Spec**: grid numbers, type ladder, placement map (element → columns/rows occupied), spacing tokens used — plus the CSS when the target is web.

## REVIEWING — protocol

Input: a screenshot (open it with Read and look), CSS/HTML, a Figma frame, or a verbal description. Then:

1. **Reconstruct the grid.** State what column structure the layout implies, if any — "left edges suggest 3 axes at ~0/33/58%, no consistent gutter" is a finding.
2. **Walk the gate.** Mark each of the nine checks pass/fail **with evidence from the artifact** ("headline 28px vs subhead 24px — a 1.17× step, fails contrast").
3. **Lead with the single highest-leverage fix** — usually grid, hierarchy, or restraint. One sentence, imperative.
4. **Ranked fix list.** Each fix concrete and measurable ("drop the subhead to 16px Regular and align it to column 7", never "add more contrast").

Report format: `Verdict (pass/fail, n/9)` → `Highest-leverage fix` → `Gate table with evidence` → `Ranked fixes`. Don't soften: if it fails the gate, it is not done.

## The Gate — nine checks, all must pass

Each check has an objective pass test and a failure action. If any check fails, apply the fix and re-run the gate — never present a failing design as finished.

| # | Check | Pass test | On fail |
|---|---|---|---|
| 1 | **Grid declared** | You can state columns, gutter, margins, and baseline as numbers, and derive every element's position from them | Stop. Construct the grid, then re-place everything on it |
| 2 | **Aligned** | Every element edge sits on a grid line; no one-off alignment axes | Snap each offender to the nearest column; delete stray axes |
| 3 | **Hierarchy in 3 seconds** | Squint test: exactly one element dominates, and you can write the read order 1-2-3 without hesitating | Demote the competitor (size and weight down) — don't enlarge everything |
| 4 | **Type carries it** | Cover all imagery: the message survives in type alone; ≤2 faces, ≤3 weights, zero type effects | Cut to a compliant set; replace any effect with scale/weight/position |
| 5 | **Asymmetric balance** | Dominant mass is off-center; the composition is not mirror-symmetric; a deliberate void counters the heavy zone | Move the dominant element off-axis onto the grid and let whitespace do the countering |
| 6 | **Contrast steps are big** | Adjacent hierarchy levels differ by ≥1.5× size, or a full weight jump, or a clear position change | Widen the gap — or merge the two levels into one |
| 7 | **Whitespace works** | Margins untouched; the largest empty area is deliberate; related items sit closer together than unrelated ones | Remove or shrink content — never shrink margins to make room |
| 8 | **Consistent system** | Equivalent elements are identical in size/weight/spacing; every spacing value is a baseline multiple from one ladder | Tokenize: one value per role, applied everywhere |
| 9 | **Restraint proven** | For every element you can say what breaks if it's removed; zero decorative-only elements (rules, boxes, icons that repeat text) | Remove it. Then re-run the gate |

The objective is not visual excitement. The objective is clarity, order, and effortless communication.

## When content resists reduction

Dense tables, legal text, forms, dashboards — reduction has a floor. Don't delete information; organize it harder:

- **Tables:** the grid *is* the table. Numbers right-aligned, text left-aligned, units in the header not the cells. Separate rows with whitespace or hairlines, never heavy rules or boxes; hierarchy inside the table via weight only.
- **Legal / dense text:** accept the gray block. Two hierarchy levels max, measure 45–75 characters (two columns if wide), generous leading, size floor (print ≥ 7pt, web ≥ 12px). Give the *page* structure with margins and running heads rather than decorating the text.
- **Forms / dashboards:** group with space, not boxes. One label alignment. Every widget on the column grid; whitespace between groups ≥ 2× whitespace within a group.

## Resources (open on demand)

- **`references/principles-full.md`** — the depth layer: full rationale behind each of the nine tenets (grid, alignment, hierarchy, typography, asymmetry, contrast, whitespace, consistency, restraint), the failure patterns each one catches, and worked grid-construction examples. Open it when you need the *why*, are teaching the system, or a review is being disputed.
- **`assets/references/INDEX.md`** — the annotated canon: canonical Swiss works with, for each, exactly what to imitate (grid structure, scale contrast, spatial division). The actual image files sit alongside it — **open them with the Read tool to look at them** when calibrating a composition.

## Applying within the Enoevol / Vanish system (optional)

This skill is style-agnostic, but when working inside the Enoevol/Vanish design language the tenets map cleanly onto the existing tokens — they don't override them:

- **Typography First / Restraint** → Inter for text, Geist Mono for labels/metadata; let weight and scale do the work.
- **Restraint / Consistency** → flat, `border-radius: 0`, no decorative shadows or gradients.
- **Contrast / Hierarchy** → coral `#ff5b45` is the single accent — use it to mark the one most important thing, never as decoration. Spend it sparingly or it stops meaning anything.
- **Grid / Alignment** → establish the column + baseline grid before placing components; align coral blocks and type to it.
