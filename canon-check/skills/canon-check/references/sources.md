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

- First check what history you actually have: if `git log` fails, or
  `git rev-parse --is-shallow-repository` prints `true`, note "git history:
  shallow/unavailable" in the report Summary and mark untraceable origins
  as `untraced` — never present the oldest visible commit as where a value
  began.
- `git log --grep` for design-related keywords ("spacing", "radius",
  "color", "rebrand", "design system") to find commits where a value was
  deliberately chosen or changed, and check whether that decision is
  reflected anywhere durable today.
- `git log -S"<value>" --oneline --reverse` (pickaxe) to find the commit
  that *introduced* a specific token value — this is the "First appeared"
  evidence the report asks for, and often reveals whether a value arrived
  deliberately (its own commit, a design message) or as a side effect.
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
installed in this ecosystem. None of these tools pin their outputs to a
fixed directory — the files can sit anywhere in the repo (project root, a
`design/` or `reviews/` folder, next to the code they reviewed), so glob
repo-wide by filename:

- **critic-layer** (sticky-note design review): emits
  `ux_ui_change_brief.md`, `implementation_prompt.md`,
  `annotation_manifest.json`, and optionally `issue_priority_table.md`,
  usually alongside a `screenshots/` folder. The manifest is the most
  useful for this audit: each note has `category`, `severity`, and
  `status` (`open` / `resolved` / `dismissed`) — a note marked `resolved`
  is a past suggestion that *was implemented*, i.e. exactly the kind of
  one-off that may have ossified into unwritten law.
- **swiss-design**: layout/typography critiques and grid-system
  recommendations, typically markdown; specific values it prescribed
  (type scale, grid columns) may now be live in the code.
- **ux-strategy** skills: design-brief, design-principles,
  north-star-vision, or information-architecture outputs (typically
  markdown files with a clear title matching the skill name).
- **design-consultation** / **design-review** (gstack): proposed design
  systems, font/color preview outputs, QA findings.
- **portfolio-story-builder**: case-study or style documentation that may
  encode design rationale even though it wasn't the primary purpose.

Glob broadly: `**/*change_brief*`, `**/*change-brief*`,
`**/annotation_manifest*.json`, `**/implementation_prompt*`,
`**/*design-brief*`, `**/*design-principles*`, `**/*style-audit*`,
`**/*design-review*`, `**/*critique*`. If a match exists, read it and ask
exactly one question per suggestion: **did it get implemented, and is it
still being followed without anyone having consciously re-affirmed it?**

Two boundaries keep this source honest:

- **Absence is normal, not a finding.** Most repos have none of these
  artifacts. If the globs come up empty, the Summary just says "0 prior
  design-review artifacts" and the audit proceeds — don't hunt harder, and
  don't treat their absence as evidence of anything.
- **Don't redo their jobs.** critic-layer runs live reviews; swiss-design
  critiques layouts. This audit never re-critiques the design or re-opens
  their issues on the merits — it only traces whether a past artifact's
  suggestion quietly became canon, and whether the artifact itself is
  still live (Document Relevance).
