# One concise review, one shared understanding

Keep one living `review.md` in the local run directory alongside `inventory.json`
and the recovery `manifest.json`. Do not create a new in-repo report stack.

## Before execution

Record:
- mode, project, scope, run directory, baseline HEAD/status and coverage limits;
- past purpose, existing implementation, agreed direction, unresolved intent;
- sources supporting that interpretation (paths and relevant passages);
- groups with exact members, evidence, proposed disposition and preserved knowledge;
- the few questions that change disposition, answers and any split groups;
- resolved action plan including surviving-document edits and recovery location.

Make the plan available before mutations. If the user requested only an audit or
discussion, stop after the review. Do not ask for execution approval just to turn
an audit into cleanup. For a cleanup request, act within already authorized
scope and resolved decisions. If a proposed action is outside that scope, ask
about that concrete action only; do not reopen the entire plan. Never treat
silence, elapsed time, or a suggested default as an answer.

Prefer 2-4 material questions, grouped by initiative or evidence. This is guidance,
not a fixed quota. Do not ask about facts already established in the session,
and do not ask separately about every file or every plugin. A user can split a
group by naming an exception. Hold unresolved groups without blocking independent
approved cleanup. If the user does not answer, retain the affected material.

## After execution

Update the same review with:
- actual moves/deletions/local-only changes and documentation edits;
- useful findings/decisions retained and their surviving homes;
- reference checks and relevant baseline-versus-after results;
- any restored files and newly discovered operating dependencies;
- exact recovery paths/commands and a link to the manifest;
- remaining decisions, errors, scan caps, and skipped checks;
- working-tree reduction, tracked-file reduction, and disk-space impact separately.

Do not label static inspection as runtime verification. Keep the local archive
without a mandatory teardown question or expiry. The repository should contain
less residue after the operation, not a newly committed collection of cleanup
reports. Existing team documentation conventions may justify a concise decision
entry, but not copying the entire review back into source control.
