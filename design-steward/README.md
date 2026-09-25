# Design Steward

Turn visual feedback into verified product changes while keeping design decisions
and project guidance aligned, with Cut Weight for authorized repository cleanup. A curated Claude Code plugin by Matthew Cohen.

## Install

```text
/plugin marketplace add enoevol81/enoevol-plugins
/plugin install design-steward@enoevol-plugins
```

For an unpublished local checkout: `claude --plugin-dir ./design-steward`.
Requires Python 3 for evidence tracking and source checks. Live review requires a
compatible browser bridge (the bundled capture workflow supports Claude in Chrome)
or manual DevTools injection. Existing capture synthesis needs no browser.
Claude Code is the initial supported host; Cowork/chat execution is not certified.

## Seven independent skills

| Command | Result |
| --- | --- |
| `/design-steward:audit` | Scoped, cited design decisions and conflicts, with a freshness baseline |
| `/design-steward:review` | Live notes, drawings and preview edits, with recoverable captures |
| `/design-steward:brief` | Stable issue IDs, source candidates and acceptance criteria |
| `/design-steward:align` | Authorized decisions reflected in relevant documents |
| `/design-steward:execute` | Plan/run/resume modes with dependency-aware progress and evidence |
| `/design-steward:verify` | Before/after checks against each issue and target viewport |
| `/design-steward:cleanup` | Cut Weight intent review, residue cleanup and verified external recovery |

Example: "Review this local page, resolve its button-radius conflict, implement
the direction I choose, and verify at 390px and 1280px." Each stage is usable on
its own; asking for review does not authorize implementation or publication.

## What stays distinct

A suggestion is not a standard. A preview is not a source change. A source change
is not a verified interface. Evidence records these distinctions throughout the
workflow. Existing authorization carries forward; only new decisions require
clarification. The plugin does not elevate permissions or assume special agents.

Runs live under `.design-steward/<run-id>/`. Tab recovery uses sessionStorage,
which the reviewed origin can read; export to local capture.json for durable
recovery. Imported captures never replay HTML changes. Disable tab recovery for
sensitive reviews with `window.__CRITIC__.forgetRecovery()`.

## Development and release

The standalone plugins are canonical component sources. The developer test suite
uses PyYAML; browser regressions use Playwright with an installed Chromium-family
browser. These are development dependencies, not plugin runtime requirements.
From the repository root:

```text
python scripts/build_design_steward.py
python scripts/build_design_steward.py --check
python -m unittest discover -s tests -p "test_*.py"
claude plugin validate ./design-steward
python scripts/package_design_steward.py
python scripts/package_design_steward.py --plugin cut-weight
```

`components/` and the three root Python helpers are generated, checked-in release
files; edit canonical sources and rebuild. Runtime never imports a sibling plugin.
Only the seven top-level skills are exposed. No always-on execution hook is bundled.
See `references/workflow.md`, `examples/README.md` and `RELEASE-CHECKLIST.md`.


## Original Enoevol plugins

Hands Free, Canon Check, Critic Layer and Cut Weight remain separate, maintained
plugins in the Enoevol marketplace. They are the canonical sources for this bundle.
A component fix is made there first and included here by rebuilding; packaging
never replaces or freezes those original plugins. The bundle needs no sibling
plugin installations. Cleanup archives stay outside the project even though
ordinary Design Steward run artifacts live under `.design-steward/`.
