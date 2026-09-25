# Evidence and decisions

Record each finding with a stable ID, property/semantic role, value, source
citations, scope (app/component/theme/breakpoint), confidence, decision status,
and exceptions. Use `unknown` when a scope cannot be established.

Decision status is separate from evidence confidence:

- observed: exists in source; no approval inferred.
- proposed: a suggestion, including a Critic Layer note or generated brief.
- approved: explicitly accepted by the user or an authoritative standards artifact;
  cite the decision and its scope. A stale artifact may be contradicted.
- superseded: replaced by a named later decision; preserve historical meaning.
- unresolved: competing sources or missing direction.

Repeated values establish an observed pattern, never user approval. Compare values
only within the same semantic role and scope. A dark-theme accent or mobile spacing
exception is not automatically a global conflict. Do not silently infer a source's
authority from recency or frequency. A review annotation is not a design standard.

## Freshness and incremental checks

At audit time, save a baseline outside the scanned source set:

```text
python <plugin>/scripts/source_snapshot.py save <project> <project>/_canon-check/<run>/sources.json --scope .
python <plugin>/scripts/source_snapshot.py check <project> <project>/_canon-check/<run>/sources.json
```

Check before reusing a report. Exit 0 means unchanged within the stated source
scope; exit 2 means stale or partial; exit 1 means unavailable/invalid. Additions
and deletions matter, as do uncommitted edits. Re-read changed sources and their
consumers; refresh affected findings and citations. A broad direction change or
scope change requires a wider audit. A snapshot never proves remote PR/session
history is unchanged; date and recheck those sources separately when relevant.
Save a new baseline only after the corresponding report has been refreshed.

## Authorized alignment

Carry forward clear user decisions. Present one grouped proposed diff for unresolved
choices; do not demand a second approval for the same already-authorized scope.
Ask only when a new decision or scope expansion is required. Record the decision,
source, affected issue IDs, and changed documents. Edit relevant sections only.
Code/token restyling must be within the user's requested scope.

For Cut Weight integration, prefer a bundled component when the calling plugin
provides one; otherwise use the separately installed plugin. Read that component's
current recovery contract and workflow-handoff guidance. Do not hardcode an old `_quarantine` convention. Its current default is
a sibling local graveyard with verified copies, hashes, manifest and recovery
instructions. Without that plugin, preserve retired docs in the run's `retired/`
folder and record original paths and hashes before removing them from their old
location. Check references and preserve user edits. Never purge the archive.
