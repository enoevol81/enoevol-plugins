#!/usr/bin/env bash
# enforce-goal-budget.sh — Stop hook that mechanically enforces the hands-free
# /goal budget, independent of whether the model remembered to self-check.
#
# Fires on every Stop in any session where the hands-free plugin is installed,
# so it is a strict no-op unless the assistant's final message actually contains
# a `/goal [ ... ]` block. When it does, it runs the bundled budget checker; if
# the block is over the 4000-char hard ceiling it BLOCKS the stop and feeds the
# model a reason, forcing a compress-and-re-emit before the turn can end.
#
# Fails open: any missing dependency, unreadable transcript, or parse failure
# exits 0 (allow stop) rather than wedging the session.

set -uo pipefail

# Resolve the plugin root (env var set by Claude Code; fall back for local runs).
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CHECKER="$PLUGIN_ROOT/skills/hands-free/scripts/check-goal-budget.sh"

input="$(cat)"

# jq is required to parse the hook payload + transcript; without it, don't block.
command -v jq >/dev/null 2>&1 || exit 0
[ -x "$CHECKER" ] || [ -f "$CHECKER" ] || exit 0

# Loop guard: if a prior Stop hook already kept the model running, bow out.
active="$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)"
[ "$active" = "true" ] && exit 0

transcript="$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)"
{ [ -n "$transcript" ] && [ -f "$transcript" ]; } || exit 0

# Pull the text of the LAST assistant message from the JSONL transcript.
last_text="$(jq -rs '
  [ .[] | select(.type == "assistant") ] | last | .message.content as $c
  | if ($c | type) == "array"
    then ([ $c[] | select(.type == "text") | .text ] | join("\n"))
    else ($c // "")
    end
' "$transcript" 2>/dev/null)"

[ -n "$last_text" ] || exit 0

# Only act when this turn actually emitted a /goal block. Otherwise no-op.
printf '%s' "$last_text" | grep -Eq '^[[:space:]]*/goal[[:space:]]*\[' || exit 0

# Run the same budget gate the skill uses. Exit 1 == over the hard ceiling.
result="$(printf '%s' "$last_text" | bash "$CHECKER" 2>&1)"
code=$?

if [ "$code" -eq 1 ]; then
  # First line of the checker output carries the char count + overage.
  detail="$(printf '%s' "$result" | head -n1)"
  reason="Budget gate failed before stopping — ${detail} Compress the /goal block (cut or merge non-essential subtasks first; keep the canonical EXECUTION MODE and LEAD blocks verbatim; never truncate mid-structure), then re-emit a block that passes scripts/check-goal-budget.sh. Do not stop until it is under the 4000-character ceiling."
  jq -n --arg r "$reason" '{decision: "block", reason: $r}'
  exit 0
fi

# Pass, warn, or no parseable block — allow the stop.
exit 0
