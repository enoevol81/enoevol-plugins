# CLAUDE.md

Project rules for the **enoevol-plugins** marketplace — a persistent Claude Code plugin
marketplace for Matthew Cohen / Enoevol. Each plugin packages a single skill (occasionally
more) so users install exactly what they need.

## Repository layout

```
enoevol-plugins/
├── .claude-plugin/marketplace.json   # lists every plugin — the source of truth
├── README.md                         # human-facing index (table + structure tree)
├── .gitattributes                    # pins *.md, *.json, SKILL.md, commands to LF
└── <plugin-name>/                    # one self-contained directory per plugin
    ├── .claude-plugin/plugin.json
    ├── README.md                     # optional but preferred for non-trivial plugins
    └── skills/<skill-name>/SKILL.md  # plus references/, assets/, scripts/, agents/ as needed
```

## Rules for adding or changing a plugin

1. **One self-contained directory per plugin**, named the same as the plugin. It must contain
   `.claude-plugin/plugin.json` and at least one `skills/<name>/SKILL.md`.
2. **Register it in two places, every time** — a new or renamed plugin is not done until both
   are updated:
   - `.claude-plugin/marketplace.json` → add a `{ name, source: "./<dir>", description }` entry.
   - root `README.md` → add a row to the **Plugins** table and a node to the **Structure** tree.
3. **`SKILL.md` must open with valid YAML frontmatter** delimited by `---` on its own line:
   ```
   ---
   name: <skill-name>
   description: >-
     <when-to-use, written to trigger reliably>
   ---
   ```
   `name` must match the skill directory. Never use a Markdown heading (`## name:`) in place of
   frontmatter — the parser keys on the exact `---` delimiter and the skill silently fails to
   load otherwise.
4. **LF line endings, always.** `.gitattributes` pins `*.md`, `*.json`, `**/SKILL.md`, and
   `**/commands/*` to LF. A trailing CR breaks frontmatter parsing. Don't introduce CRLF.
5. **`plugin.json` shape** mirrors the existing plugins:
   `name`, `version` (start `"0.1.0"`), `description`, `author` (`{ name, email }`),
   `homepage` + `repository` (`https://github.com/enoevol81/enoevol-plugins`), `license`
   (`"MIT"`), and a `keywords` array.
6. **Reference paths are relative to the file that names them.** A reference in
   `skills/<name>/references/foo.md` points at sibling assets via `../assets/...`. Keep the
   filename a reference advertises (e.g. `principles-full.md`) identical to the path that links
   to it.
7. **Bundled MCP servers** (see `icon-forge/`) live in the plugin's `mcp/` directory and are
   registered through the plugin's own `.mcp.json`; their Node deps are installed once by the
   user, not committed.

## Conventions

- **Author:** Matthew Cohen `<mcohen@enoevol.com>`. **License:** MIT.
- Keep `marketplace.json` plugin descriptions and the README table row in sync — same plugin,
  consistent one-line description.
- Plugins are self-contained: no cross-plugin imports.

## Publishing note

The online marketplace reflects whatever is on the **`main`** branch. A plugin added on a
feature branch won't appear in `/plugin` listings until it's merged to `main`; an installed
marketplace may also need `/plugin marketplace update enoevol-plugins` to refresh its cache.
