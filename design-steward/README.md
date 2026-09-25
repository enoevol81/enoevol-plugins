# Design Steward

Turn visual feedback into verified product changes while keeping design decisions
and project guidance aligned, with Cut Weight for authorized repository cleanup. A curated Claude Code plugin by Matthew Cohen.

## Install

```text
/plugin marketplace add enoevol81/enoevol-plugins
/plugin install design-steward@enoevol-plugins
```

For an unpublished local checkout: `claude --plugin-dir ./design-steward`.

## Requirements and where it works

- **Claude Code** is the supported host. The skills work on a local project folder.
- **Python 3** runs the bundled helper scripts (progress ledger, source freshness,
  source mapping, cleanup inventory).
- **Live review** needs a browser bridge such as Claude in Chrome, or you can paste
  the overlay script into DevTools yourself. Turning an existing capture into a brief
  needs no browser.
- **claude.ai chat and Cowork** can load the skills, but they are not tested there.
  Without access to your project folder, Python and a browser, most stages won't work.

Install either this bundle or the standalone Hands Free, Canon Check, Critic Layer and
Cut Weight plugins, not both, so their skills don't compete for the same requests.

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

## What it runs and touches

Everything stays on your machine. The plugin has no hooks, no MCP servers, and makes
no network requests of its own.

- **Local scripts:** Python helpers bundled in the plugin read your project files and
  write JSON records. The cleanup inventory also runs read-only `git` commands
  (`ls-files`, `rev-parse`, `log`, `check-ignore`) in your project.
- **Project files:** run records go in `.design-steward/<run-id>/` inside your project.
  Align and execute edit only the documents and source files you authorize.
- **Browser review:** the review overlay is injected into the page you are reviewing.
  It stores notes, drawings and preview edits in that tab's sessionStorage, can copy
  an export to your clipboard, and sends nothing anywhere.
- **Cleanup archives:** approved removals are copied, with a manifest and restore
  steps, to a `<project>-graveyard/` folder next to your project before anything is
  removed. Only groups you approve are removed, using `git rm` for tracked files and
  left uncommitted for you to review. Archives are never deleted automatically.

## Development and release

The standalone plugins are canonical component sources. The developer test suite
uses PyYAML; browser regressions use Playwright with an installed Chromium-family
browser. These are development dependencies, not plugin runtime requirements.
The tooling lives in the enoevol-plugins repository's `_dev/` folder and is not part
of this plugin. From the repository root:

```text
python _dev/scripts/build_design_steward.py
python _dev/scripts/build_design_steward.py --check
python -m unittest discover -s _dev/tests -p "test_*.py"
claude plugin validate ./design-steward
python _dev/scripts/package_design_steward.py
python _dev/scripts/package_design_steward.py --plugin cut-weight
```

`components/` and the three Python helpers in `scripts/` are generated, checked-in release
files; edit canonical sources and rebuild. Runtime never imports a sibling plugin.
Only the seven top-level skills are exposed. No always-on execution hook is bundled.
Behavior tests for `claude plugin eval` live in `evals/` (see `evals/README.md`).
See `references/workflow.md`, `examples/README.md` and `RELEASE-CHECKLIST.md`.


## Original Enoevol plugins

Hands Free, Canon Check, Critic Layer and Cut Weight remain separate, maintained
plugins in the Enoevol marketplace. They are the canonical sources for this bundle.
A component fix is made there first and included here by rebuilding; packaging
never replaces or freezes those original plugins. The bundle needs no sibling
plugin installations. Cleanup archives stay outside the project even though
ordinary Design Steward run artifacts live under `.design-steward/`.
