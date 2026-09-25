# Capture to verified change

Preserve each `issueId` (`sessionId:localId`) through the brief, plan, code change
and verification. For a legacy capture without sessionId, assign a stable import
ID once and save the normalized capture; do not regenerate it on every read.

For each issue record: original note/drawing/edit, authoredBy, URL, viewport,
anchorStatus, intended scope, proposed change, acceptance criteria, decision
status, source candidates, implementation status, and verification evidence.
Lifecycle: captured -> proposed -> authorized -> implemented -> verified.
Unresolved/dismissed items remain explicit. A captured suggestion never becomes
an approved standard or authorized implementation merely by being exported.

## Recovery

The overlay saves every second and on pagehide to sessionStorage for the exact
URL in the current tab. Reinject after reload to restore. Storage is readable by
the reviewed page's origin and lasts only for the browser tab/session; it is not
a private vault or a disk backup. State this briefly when starting a review.
For sensitive pages, call `window.__CRITIC__.forgetRecovery()` and collect exports
directly to a local artifact. The HUD reports failures; never claim an unavailable
save succeeded. Do not capture credentials or unrelated page content.

After each completed review segment and before navigation, read
`window.__CRITIC__.export()` and write it to the run's local `capture.json`.
While actively reviewing a long session, collect at reasonable intervals when
the browser bridge is available. Never rely on tab storage after closing the tab.
For local-file recovery, read capture.json and call `window.__CRITIC__.import(data)`
after injection on the same URL. Import restores records only, never HTML edits.
Malformed, wrong-page or unsupported captures are rejected. Do not merge unrelated
sessions by silently replacing one: export the current session first.

## Map and brief

Run `python <plugin>/scripts/source_candidates.py <project> <capture.json>`.
This locates text/ID/class candidates, not definitive component ownership. Inspect
the component and its consumers before marking mapping verified. Missing or
ambiguous anchors remain open. Drawings without element identities need manual
mapping. A unique text match alone does not prove component ownership.

Keep exact preview values as evidence, but interpret them against tokens, CSS
layout, themes and breakpoints before changing source. The acceptance criterion
describes the intended behavior at each relevant viewport; do not hardcode a
desktop pixel value globally. AI suggestions stay attributed and separate.

## Verification

Reopen the requested page at the same viewport(s). Capture before/after evidence
for the same issue IDs. Check the actual implementation, responsive behavior and
relevant functionality. A DOM preview is never source implementation, and source
implementation is never browser verification. Mark blocked checks open. Report
verified, implemented-but-unverified, dismissed and unresolved items separately.
