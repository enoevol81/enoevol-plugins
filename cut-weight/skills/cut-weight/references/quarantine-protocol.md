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
      "reason": "unreachable from server.js; 0 references; mtime 14mo, last commit 16mo"
    }
  ]
}
```

## Order of operations

1. **Checkpoint first.** Confirm the pre-cut-weight checkpoint commit from
   Phase 0 exists. No checkpoint, no moves.
2. **Cuts (regenerable deletes).** Delete artifact dirs/files, update
   `.gitignore` in the same change. Record bytes freed.
3. **Quarantine moves, one commit.** For git-tracked files use `git mv` so
   history follows the file; plain `mv` for untracked ones. Write the
   manifest, add `_quarantine/` to `.gitignore` ONLY if the user prefers the
   quarantine untracked -- default is to commit it, because a committed
   quarantine gives `git revert` superpowers. Single commit:
   `chore: quarantine dead weight (see _quarantine/<date>/manifest.json)`.
4. **Verify** (Phase 5 of SKILL.md) before reporting anything as done.

Keep cuts and quarantine in separate commits: reverting the quarantine must
not resurrect `dist/`.

## Restoring

- **Everything**: `git revert <quarantine-commit>` -- this is why the moves
  live in a single commit.
- **One file**: `git mv _quarantine/<date>/<path> <path>` (or plain `mv` if
  untracked), then remove its manifest entry.
- **Nuclear**: `git reset --hard <checkpoint>` -- mention it in the report
  but never run it yourself; it destroys any work done since.

Put the exact revert command, with the real SHA, in the report's Restore
section. The user should not have to figure out how to undo this.

## Non-git projects

If the user declined `git init`, quarantine is the only removal mechanism --
including for regenerable artifacts (they move to
`_quarantine/<date>/_artifacts/` instead of being deleted). The manifest
carries the whole restore story; there is no revert to lean on, so
double-check the manifest is complete before moving anything.

## Expiry

Quarantine is a decision buffer, not a landfill. End the report with:
"Review `_quarantine/<date>/` after ~30 days; if nothing broke and nothing
was missed, delete it (or `git rm -r` it) in one commit." Deleting a
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
