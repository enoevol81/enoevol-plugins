# cut-weight

Intent-informed repository sanitation. Cut Weight reads current guidance and
related older plans, establishes a shared understanding through a brief grouped
conversation, then removes development residue while protecting operational files.

## What it cleans

Superseded product narratives, completed improvement passes, duplicate plans,
audit reports and captures, plugin output, scratch files, and disposable generated
artifacts. It preserves unique decisions and unresolved findings before archiving
their originals. Old does not mean obsolete; recent does not mean useful.

Working source, tests, dependencies, runtime data, deployment, and active tool
configuration are protected. Sidelined features do not need a promise of future
use to survive. Feature retirement is separately scoped work.

## Workflow

1. Inventory and read current documents, linked history, and related folders.
2. Explain past purpose, current implementation, agreed direction, and uncertainty.
3. Ask only questions that change cleanup decisions, usually a few grouped choices.
   Carry forward existing answers instead of asking for repeated approvals.
4. Keep, consolidate, archive, retain locally without tracking, or delete proven
   disposable output. Inspect mixed plugin folders before deciding.
5. Repair stale references and guidance in AGENTS.md, CLAUDE.md, DESIGN.md, and
   existing product/intent documents. Broader design decisions remain separate.
6. Verify references and affected consumers; record results and recovery locations.

Modes: **audit** changes no project files; **cleanup** executes authorized groups;
**aggressive** is decisive about residue but does not expand into operational code
or permanent graveyard purge. The former `standard` mode maps to cleanup.

## Review completeness

Every discovered Markdown document and recognized tooling group gets an explicit
review item, including ignored and untracked material. Each must receive an
evidence-backed disposition or remain visibly ASK/UNREVIEWED; unresolved coverage
is reported as partial cleanup. Being gitignored is not a reason to keep clutter.

The default age review trigger is **60 days** on either mtime or Git last-touch,
configurable with `--review-age-days N`. This requires inspection, never automatic
deletion. Completion history and superseded content are reviewed even when a file
was recently edited. Current source and operational configuration stay protected.
Surviving product/strategy guidance must agree with the established direction;
valid links alone are insufficient. Done-heavy backlogs can be consolidated while
preserving unresolved work. Recovery requires manifest.json and verified pre-edit
copies even for tracked documents.

## Local-only recovery

The default graveyard is outside the repository, with verified copies, original
paths, hashes, and recovery instructions. Inventory, one living review, and the
manifest stay there too. No automatic checkpoint commits, archived payload commits,
or teardown prompts. An in-repo ignored archive is optional. Ignore rules do not
untrack files or erase old Git history. Archiving on the same disk does not free
space there. Recovery depends on retaining the local archive.

## Implementation and limits

`skills/cut-weight/SKILL.md` defines the workflow; `references/` covers intent
review, evidence, tooling, operational consumers, and recovery mechanics.
`scripts/inventory.py` is a read-only Python 3 metadata/Markdown discovery tool.
It inventories known tooling folders without labeling them disposable, includes
source inside build-named folders, protects Git pointer files, and reports scan
caps, preview truncation, omitted dependencies, and errors. Pass an explicit fresh
`--out` path outside the repository. Inventory schema version 2 separates observed
metadata from dispositions; consumers of the older schema must adapt.

The agent reads documents, resolves semantic groups, performs cleanup and recovery,
and verifies results. The inventory script does not automate those judgments or
provide an automatic restore command. Restore instructions are produced for each
actual cleanup using its manifest and verified copies.

Run the isolated inventory regressions:

```text
python cut-weight/skills/cut-weight/scripts/test_inventory.py
```

## Install / update

```text
/plugin marketplace add enoevol81/enoevol-plugins
/plugin install cut-weight@enoevol-plugins
```

For an existing local marketplace installation, refresh the marketplace and update
`cut-weight@enoevol-plugins`, then restart the session. Version 0.4.1 contains this
workflow; editing the marketplace source alone does not reload a cached session.
