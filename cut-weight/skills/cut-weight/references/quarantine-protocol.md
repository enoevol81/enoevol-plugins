# Quarantine protocol: reversible by construction

The promise this skill makes: nothing the user might want is more than one
command away from being back. That only holds if the mechanics below are
followed exactly.

## Layout

Quarantined files move to a dated folder at the project root, preserving
their relative paths so restoration is mechanical:

```
_quarantine/
  2026-07-02/
    manifest.json
    lib/old-parser.js        <- was lib/old-parser.js
    debug-fetch.js           <- was debug-fetch.js
    notes/PLAN-2024.md       <- was notes/PLAN-2024.md
```

`manifest.json` records enough to restore and enough to justify:

```json
{
  "date": "2026-07-02",
  "checkpoint_commit": "<sha of the pre-cut-weight checkpoint>",
  "moves": [
    {
      "from": "lib/old-parser.js",
      "tracked": true,
      "reason": "unreachable from server.js; 0 references; mtime 14mo, last commit 16mo"
    }
  ]
}
```

Record `tracked` for every move -- restoration differs for tracked vs
untracked files (see Restoring), and after the move the manifest is the only
place that remembers which was which.

## Order of operations

1. **Checkpoint first.** Confirm the pre-cut-weight checkpoint commit from
   Phase 0 exists. No checkpoint, no moves.
2. **Cuts (regenerable deletes).** Delete artifact dirs/files, update
   `.gitignore` in the same change. Record bytes freed.
3. **Quarantine moves, one commit.** For git-tracked files use `git mv` so
   history follows the file; plain `mv` for untracked ones. Write the
   manifest, add `_quarantine/` to `.gitignore` ONLY if the user prefers the
   quarantine untracked -- default is to commit it (including the moved-in
   copies of previously untracked files), because a committed quarantine is
   what keeps everything recoverable from history. Single commit:
   `chore: quarantine dead weight (see _quarantine/<date>/manifest.json)`.
4. **Untrack + gitignore dispositions, their own commit**
   (`chore: untrack agent artifacts`): the `git rm --cached` calls plus the
   `.gitignore` edits. Never mix these into the quarantine commit -- their
   undo is different (see Restoring), and `git revert` on a commit that
   removed a still-on-disk file from the index fails with "untracked working
   tree files would be overwritten".
5. **Verify** (Phase 7 of SKILL.md) before reporting anything as done.

Keep cuts, quarantine, and untracks in separate commits: reverting the
quarantine must not resurrect `dist/` or re-track a file the user chose to
untrack.

## Restoring

Each disposition has its own undo -- state the applicable ones, with real
SHAs and paths, in the report's Restore section. The user should not have to
figure out how to undo this.

- **Everything quarantined, manifest-driven (always correct)**: for each
  manifest entry, `git mv _quarantine/<date>/<path> <path>` if `tracked`,
  plain `mv` if not; then one restore commit. This works regardless of what
  was tracked.
- **Everything quarantined, via revert**: `git revert <quarantine-commit>`
  is the one-command shortcut, but it is only equivalent when **every**
  manifest entry has `tracked: true`. For an untracked-origin file the revert
  merely deletes its quarantine copy without recreating the original path --
  check the manifest before offering this command, and prefer the
  manifest-driven restore when any entry is untracked.
- **One file**: `git mv _quarantine/<date>/<path> <path>` (or plain `mv` if
  the manifest says untracked), then remove its manifest entry.
- **An untrack**: `git add <path>` plus deleting its `.gitignore` line, then
  commit. Do NOT `git revert` the untrack commit -- git refuses to overwrite
  the untracked working-tree copy ("untracked working tree files would be
  overwritten") even when the content is identical.
- **A gitignore**: delete the added line(s) from `.gitignore` and commit.
- **Nuclear**: `git reset --hard <checkpoint>` -- mention it in the report
  but never run it yourself; it destroys any work done since.

## Non-git projects

If the user declined `git init`, quarantine is the only removal mechanism --
including for regenerable artifacts (they move to
`_quarantine/<date>/_artifacts/` instead of being deleted). The manifest
carries the whole restore story; there is no revert to lean on, so
double-check the manifest is complete before moving anything.

## Expiry

Quarantine is a decision buffer, not a landfill. It clears one of two ways:

- **Now, on confirmation** -- the post-mortem teardown (Stage 6 of
  [review-loop.md](review-loop.md)). After the user has reviewed everything
  through the decision gate, an explicit "delete everything" empties the
  buffer; in a git repo the **committed** moves keep it recoverable. If the
  user chose an untracked (gitignored) quarantine, deleting the buffer is as
  irreversible as in a non-git project -- give the same warning.
- **Later, by default** -- if the user does not tear down now, end the report
  with: "Review `_quarantine/<date>/` after ~30 days; if nothing broke and
  nothing was missed, delete it (or `git rm -r` it) in one commit." Deleting a
  quarantine folder that has sat quietly for a month is the one deletion this
  skill endorses without further analysis.

## Verification gate details

- Re-run exactly the baseline commands from Phase 0 -- same commands, same
  cwd. New failure = restore the implicated files, reclassify KEEP, rerun.
  Bisect by restoring half the quarantine at a time if the culprit is not
  obvious.
- If the project has no runnable check at all (no tests, no build, not
  startable), say so in the report and downgrade every QUARANTINE
  justification from "verified" to "static analysis only". Do not invent a
  verification that did not happen.
- A dirty `git status` after you finish (beyond the intended commits) means
  something leaked -- resolve it before reporting.
