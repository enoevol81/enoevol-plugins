# Evidence and disposition

Apply this order, explaining exceptions in the review:

1. **Operational consumer or protected role -> KEEP.** Source, tests, lockfiles,
   migrations, runtime assets, CI/deploy, credentials/data, active skills/hooks,
   and configuration are protected. Zero text references does not make a
   platform-consumed file dead. Dynamic loading preserves the relevant directory.
2. **Current guidance or unique knowledge -> KEEP or CONSOLIDATE.** Read content.
   Unresolved findings, rationale, and working procedures need a surviving home.
3. **Superseded/completed residue -> ARCHIVE.** Establish what replaced it or
   why the pass is finished. Resolve any useful remaining knowledge first.
4. **Proven disposable output -> DELETE.** Confirm an applicable regeneration
   command or explicit discard authorization. `build`, `dist`, `out`, screenshots,
   logs, JSON, and databases are not inherently disposable.
5. **Useful personal/tool state -> LOCAL_ONLY.** Verify the tool still needs its
   location and that shared consumers do not depend on tracked copies.
6. **Consequential uncertainty -> ASK.** Only the affected group waits.

## Supporting signals

- **References:** trace imports, instruction imports, scripts, links, manifests,
  CI and hook commands. Search both path and basename, excluding archive internals.
  A live dependency protects; a reference in superseded narrative can be repaired.
  Documents that only reference one another can form a historical cluster.
- **Age:** use mtime and Git last-touch as supporting evidence. Null history is
  unknown, never proof of age. New reports can already be redundant; old specs
  can still be authoritative. State scan limits.
- **Names:** `old`, `scratch`, plugin names, and dated filenames are discovery
  hints. Never let names alone authorize a move or deletion.
- **Content:** identify unique knowledge, replacement documents, unfinished work,
  duplicated passages, and the original purpose of an output. Preserve provenance
  when consolidating. Semantic judgments must cite inspected content.
- **Size:** helps prioritize and report impact; it does not determine relevance.

Do not automatically cut generated-but-required inputs: lockfiles, snapshots,
migrations, committed codegen, vendored assets, or deploy output without a proven
rebuild path. Do not prune dependencies or edit dead code during ordinary residue
cleanup. Record those as separately scoped maintenance work.
