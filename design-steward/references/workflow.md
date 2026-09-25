# Shared workflow contract

Use a unique `.design-steward/<run-id>/` directory. Read only the component
instructions relevant to the requested stage; do not force the complete pipeline.
Top-level scripts are portable entry points. When reading a bundled component,
resolve its plugin-root paths against `<plugin>/components/<component>`.
Relative links inside a bundled component skill (`references/...`, `scripts/...`)
resolve against that component skill's own folder, e.g.
`<plugin>/components/cut-weight/skills/cut-weight/references/...`, never the
plugin root.

Artifacts:
- capture.json: original notes/drawings/preview edits, stable session and issue IDs.
- canon-report.md and sources.json: cited findings, scope, decision status and baseline.
- decisions.json: issue/finding ID, decision, scope, authority, status and exceptions.
- brief.md: requested changes, source candidates, acceptance criteria, unresolved items.
- plan.json and run.json: dependency-ordered implementation and recorded evidence.
- verification.md: each issue, requested viewport, actual check, result, evidence path.

Use one record per issue with `issueId`, `authoredBy`, `sourceCapture`, `scope`,
`decisionStatus`, `acceptance`, `sourceCandidates`, `implementationStatus` and
`evidence`. Preserve original capture wording; the brief may interpret it but
cannot overwrite it. Allowed decision states: observed, proposed, approved,
superseded, unresolved. Allowed implementation states: pending, running, blocked,
implemented, verified, dismissed. An approved exception is scoped explicitly.

Canon Check's component instructions default to `_canon-check/`; in this package
use the run directory above instead. Hands Free's `.hands-free/` likewise maps to
this run directory. The freshness helper excludes these generated directories.
Existing standalone report/capture imports retain their origin and IDs.

Cut Weight is bundled at `components/cut-weight/`. Its cleanup stage is an
exception to the in-project run directory: all inventory/review/recovery payloads
stay in the external graveyard required by its protocol. The current run may
hold a concise recovery pointer. Do not archive active ledgers or their evidence.

## Stage handoffs

Review -> brief: capture + issue IDs + URL/viewports. Brief -> align: proposed
changes and conflicts; choose direction using current authorization. Align ->
execute: decision record + scoped brief + acceptance criteria. Execute -> verify:
actual source changes and check outputs. Verify -> audit: refresh affected canon
findings, document remaining code/doc drift, then update the source baseline.

Align -> cleanup: authorized document-retirement groups, relevant decision/issue
IDs and unresolved work. Use the bundled cleanup skill whenever authorized
retirement needs recovery; no separately installed Cut Weight is required.
Cleanup -> audit/verify: actual dispositions and recovery paths, repaired
references, coverage gaps and affected-source checks. Whole-project cleanup runs
only when requested; including this skill does not silently expand design work.

Execution must not resolve an undecided design conflict by guessing. An explicit
user instruction to make a change is authorization for that scoped change.
Carry that forward; do not require repeated approval for the same decision.

## Boundaries

Use available tools; report missing capabilities. Browser-unavailable runs can
still audit source and synthesize captures but cannot claim visual verification.
The run ledger checks evidence presence/hashes and dependency order. It does not
execute tasks, evaluate truth, enforce spend, or grant permissions. The agent
evaluates acceptance and records actual checks. No automatic publishing.
