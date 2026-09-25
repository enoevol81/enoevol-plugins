# Optional legacy goal export

The `/goal [ ... ]` wrapper is a compatibility format for a known downstream
consumer, not a universal executable command. Verify the receiving environment.
The plugin's compatibility ceiling is 4000 characters with a 3500 target; do not
claim this is a universal Claude limit. Text length does not measure run cost.

Include OUTCOME, SUCCESS CRITERIA, CONSTRAINTS, ASSUMPTIONS, EXECUTION MODE,
ordered MILESTONES (dependencies and acceptance criteria), DELIVERABLES and
ESCALATION. EXECUTION MODE must preserve current host permissions and explicit
user authorization. Do not emit permission-bypass flags.

For large plans, reference the existing plan file rather than omitting work.
Use available agents only when supported and authorized; otherwise a single
agent executes in dependency order. Do not invent model tiers as callable models.

Run the bundled `scripts/check-goal-budget.sh` with Bash if available. The optional
legacy Stop-hook script also requires jq; it fails open and enforces only text
length. It is no longer registered by default. Missing validation must be reported.
Headless instructions are supplied only on request, after verifying host support,
using existing permission settings and a concrete plan path.
