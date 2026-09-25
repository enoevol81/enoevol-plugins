# Local validation — 2026-09-24

Implemented release: Design Steward 0.2.0; Hands Free 0.6.0; Canon Check 0.3.1;
Critic Layer 0.3.0; Cut Weight 0.4.3. The curated plugin includes seven independently callable skills.

## Passed locally

- Claude CLI manifest validation for all five plugins and the marketplace.
- Generated component comparison against canonical source files.
- Python regressions covering dependency order, evidence requirements, interrupted
  runs, stale source/evidence, dependent invalidation, partial source coverage,
  scope containment, source candidates, and standalone package layout.
- Isolated headless Microsoft Edge browser test covering actual note, drawing and
  style-edit capture; export/reload/reinjection; stable issue IDs; complete capture
  recovery; record-only import; wrong-page/malformed import rejection; ambiguous
  element identities; denied storage; clearing without ID reuse.
- Source-backed synthetic fixture workflow: record an explicit 8px radius decision,
  map candidates, update the disposable source, detect stale canon, verify at
  1280px and 390px, check mobile button width and button behavior, complete the
  evidence ledger and refresh the canon baseline.

Browser runs save capture, decisions, brief, plan, ledger, verification and
before/after screenshots under the repository's ignored `test-results/` directory.
Run `node tests/overlay-browser.cjs` with Playwright available; optional environment
variables: PLAYWRIGHT_MODULE (module path), PLAYWRIGHT_CHANNEL (e.g. msedge), PYTHON.

## Not certified by these checks

No live Claude-in-Chrome MCP session, model-driven skill evaluation, Cowork/chat
compatibility certification, production-site rollout or Anthropic submission was
performed. The synthetic decisions/brief are fixture inputs, not evidence of a
model independently choosing the correct design direction. File hashes check
evidence freshness, not truth. Semantic acceptance remains the executing agent's
responsibility. Tab storage is not a durable local-file backup.


## Cut Weight packaging

The curated cleanup skill includes the full Cut Weight skill, references,
inventory helper and regression suite. Its workflow handoff preserves active run
evidence and uses an external graveyard. Cut Weight is also packaged separately.
The package check compares bundled files byte-for-byte with canonical sources.


Validation of Cut Weight addition: all 10 workflow regressions passed. The Cut
Weight inventory suite passed 9 tests with 1 Windows symlink test skipped; the
same suite also passed from the bundled component with the same skip. Both the
Design Steward 0.2.0 ZIP and Cut Weight 0.4.3 ZIP validated after extraction to
isolated directories. The cleanup handoff itself is skill guidance, not a new
automated deletion engine or a model-driven cleanup evaluation.
