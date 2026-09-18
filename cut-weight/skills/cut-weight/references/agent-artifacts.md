# Tooling folders: inspect their role

The inventory labels known tool families as `tool-material`, not disposable.
Examples include `.gstack`, `.compound-engineering`, `.impeccable`, `_canon-check`,
and `_critic-layer`. Unknown plugin output must also be identified by content,
references, and producer/consumer evidence; no registry is exhaustive.

Inspect a folder before proposing its disposition:

| Contents | Treatment |
|---|---|
| Active hooks, scripts, skills, MCP config, shared commands | KEEP; operational consumers outrank a cleanup heuristic |
| Canonical instructions and reusable project guidance | KEEP or reconcile in place |
| Completed audits, screenshots, transcripts, obsolete plans | Group by pass; preserve unresolved findings, then ARCHIVE |
| Useful local settings or private state | LOCAL_ONLY when shared consumers do not need tracked copies |
| Rebuildable caches or explicitly disposable output | DELETE within the agreed scope |
| Mixed or unknown purpose | Split by role; ask only about unresolved groups |

Before removing a tool host folder, inspect repo instructions, package scripts,
`.claude/settings*.json`, hook registrations, `.mcp.json`, skill/command links,
and other configuration that names it. A plugin installed globally does not prove
its local output is needed; absence from application imports does not prove a
local hook is unused. Do not modify global plugin installations as repo cleanup.

`CLAUDE.md`, `AGENTS.md`, module `INTENT.md`, and other instructions are maintained
in place. Their filename is not permission to archive, untrack, or delete them.
Reconcile stale content while preserving actual operating constraints. If the
repository itself distributes plugins, its plugin folders and skill references
are product assets, not cleanup residue.

No separate mandatory plugin questionnaire. Include meaningful tooling questions
in the same brief intent conversation. Existing answers apply across matching
groups; new evidence of an active consumer changes the disposition to KEEP.

Every detected tooling group must appear in the review, including ignored files
and tracked example configs. Split reports/captures from active settings and
scripts; do not use a single cache-file mention to account for a mixed folder.
State the evidence for keeping each subgroup. "Already gitignored; no action
needed" is invalid for a local-folder sanitation request. If no current use is
established, propose archiving completed output and ask whether unused setup
material should remain. Registry misses discovered during reading must be added
to the checklist; an unrecognized tool name does not exclude it from scope.
