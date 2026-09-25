# Portable execution contract

Use Python 3 (`python`, then `python3`, then `py -3` as available) with an absolute
plugin-root path. The ledger is project-local, contains no credentials, and must
not be committed unless the user wants it shared. Use a distinct run directory.

Plan shape:

```json
{
  "schemaVersion": 1,
  "outcome": "Implement the approved button change and verify desktop and mobile",
  "constraints": ["Preserve unrelated edits", "No publication requested"],
  "capabilities": {"execution": "single-agent", "browser": "available"},
  "budgets": {"runtime": "advisory; not enforced by this ledger"},
  "steps": [
    {"id": "implement", "dependsOn": [], "issueIds": ["session:note_001"], "acceptance": "Button uses the approved scoped token"},
    {"id": "verify", "dependsOn": ["implement"], "acceptance": "Desktop/mobile checks pass and relevant docs agree"}
  ]
}
```

Commands (replace `<plugin>` and paths with actual absolute paths):

```text
python <plugin>/scripts/run_state.py init .hands-free/run-01/run.json --plan .hands-free/run-01/plan.json --root .
python <plugin>/scripts/run_state.py start .hands-free/run-01/run.json --step implement
python <plugin>/scripts/run_state.py complete .hands-free/run-01/run.json --step implement --evidence src/Button.tsx --evidence .hands-free/run-01/implementation-check.md --result "Approved token applied; focused check passed"
python <plugin>/scripts/run_state.py block .hands-free/run-01/run.json --step verify --result "Preview server unavailable" --next "Start preview, then check at 390px and 1280px"
python <plugin>/scripts/run_state.py status .hands-free/run-01/run.json
python <plugin>/scripts/run_state.py resume .hands-free/run-01/run.json
```

Record source files as evidence alongside test output so source changes invalidate
completion. Missing browser access means visual verification remains open.
Headless operation is opt-in; keep the host's existing permissions. No generated
prompt grants authorization, creates tools, or guarantees a runtime limit.
