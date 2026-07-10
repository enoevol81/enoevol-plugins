# Source catalog

How to find each category of durable document. None of these are guaranteed
to exist or to be named consistently — search broadly rather than assuming a
single canonical file.

## 1. Design tokens & config files

The most literal form of "locked in": a value that's load-bearing for every
consumer of the file, whether or not anyone remembers deciding it.

Look for (Glob, case-insensitive where relevant):
- `**/tailwind.config.*`, `**/theme.json`, `**/design-tokens.*`,
  `**/tokens.json`, `**/*.tokens.json`
- `**/brand*.{json,yml,yaml}`, `**/palette.*`, `**/colors.*`
- `**/*.css`, `**/*.scss` files defining `:root` custom properties
  (`--color-*`, `--space-*`, `--font-*`)
- Figma variable/style exports if present (`**/figma-tokens*.json`)

For each file found, extract the actual values (not just that the file
exists) — a tokens file with a `radius.md: 6px` entry is a canonical claim
whether or not any prose ever explained why.

## 2. Written docs

Explicit prose decisions — these are the ones most likely to have been
stated deliberately, but also the ones most likely to have gone stale if the
code moved on without the doc being updated.

- `CLAUDE.md` at any level (repo root and subdirectories) — look
  specifically for design/style/brand sections, not just the whole file.
- `README.md` design or "conventions" sections.
- `STYLE.md`, `style-guide.md`, `DESIGN.md`, `brand-guidelines.*`,
  `PRODUCT.md`.
- Any `docs/` or `design/` subdirectory.

## 3. Code defaults & component props

Canon nobody wrote down — it just became true by being copy-pasted enough
times that changing it in one place would look wrong next to the rest.

- Default prop values in component definitions (e.g. a `radius = "md"`
  default that's never overridden anywhere).
- Repeated hardcoded literals across otherwise-independent files — this is
  exactly what `scripts/scan_tokens.py` is for; don't try to eyeball
  frequency across dozens of files by hand.
- Naming conventions that recur without being documented (a consistent
  component-file naming scheme, a consistent prop name for the same concept
  across components).

## 4. Git / session / memory history

Decisions that were said once, out loud, and never made it into a doc.

- `git log --grep` for design-related keywords ("spacing", "radius",
  "color", "rebrand", "design system") to find commits where a value was
  deliberately chosen or changed, and check whether that decision is
  reflected anywhere durable today.
- PR descriptions, if the repo has a GitHub remote (`gh pr list --state all
  --search "design"` or similar) — a PR description is often the *only*
  place a design rationale was ever written down.
- claude-mem observations/session history, if the `claude-mem` MCP tools are
  available (`memory_search`, `observation_search`) — search for prior
  design decisions, style discussions, or explicit "let's always do X"
  statements that were never promoted into a doc. These are prime candidates
  for single-mention canon: said once in a conversation, acted on since,
  never revisited.

## 5. Prior design-review / design-planning artifacts

The case the user is most likely to have forgotten about entirely: another
design tool already ran once, produced a written recommendation, someone
implemented it, and the artifact itself now sits unreferenced in the repo
looking exactly like an accident rather than a decision.

Look for outputs from other design-oriented skills that may already be
installed in this ecosystem:
- **critic-layer**: `annotation_manifest.json`, change-brief markdown files,
  paste-ready Claude Code prompts from a past review session.
- **ux-strategy** skills: design-brief, design-principles,
  north-star-vision, or information-architecture outputs (typically
  markdown files with a clear title matching the skill name).
- **swiss-design**: layout/typography critique documents.
- **design-consultation** / **design-review** (gstack): proposed design
  systems, font/color preview outputs, QA findings.
- **portfolio-story-builder**: case-study or style documentation that may
  encode design rationale even though it wasn't the primary purpose.

Glob broadly: `**/*design-brief*`, `**/*design-principles*`,
`**/*change-brief*`, `**/*critic*manifest*`, `**/*style-audit*`,
`**/*design-review*`. If a match exists, read it and ask: did its
suggestions get implemented, and if so, are they still being followed
without anyone having consciously re-affirmed them?
