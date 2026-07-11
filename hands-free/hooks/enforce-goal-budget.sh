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
# Bounded retries: the built-in `stop_hook_active` flag only distinguishes
# "first Stop" from "any later Stop", so relying on it caps enforcement at a
# SINGLE forced retry — which is why over-ceiling blocks still slipped through.
# Instead we keep a small per-transcript retry counter and block up to
# MAX_RETRIES times, escalating the guidance from line-level trimming to the
# structural fix (externalize detail to a goal-plan.md file) before finally
# failing open so a stubborn block can never wedge the session.
#
# Fails open: any missing dependency, unreadable transcript, or parse failure
# exits 0 (allow stop) rather than wedging the session.

set -uo pipefail

# Resolve the plugin root (env var set by Claude Code; fall back for local runs).
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
CHECKER="$PLUGIN_ROOT/skills/hands-free/scripts/check-goal-budget.sh"

# How many times we will force a re-emit before giving up and allowing the stop.
MAX_RETRIES=4

input="$(cat)"

# jq is required to parse the hook payload + transcript; without it, warn once
# on stderr and no-op cleanly (never block the user's Stop on a missing dep).
if ! command -v jq >/dev/null 2>&1; then
  echo "hands-free: jq not found on PATH — skipping /goal budget enforcement (install jq to enable it)" >&2
  exit 0
fi
[ -f "$CHECKER" ] || exit 0

transcript="$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)"
{ [ -n "$transcript" ] && [ -f "$transcript" ]; } || exit 0

# Per-transcript retry counter. Keyed by a hash of the transcript path so
# concurrent sessions never share a counter. Lives in the system temp dir and is
# deleted whenever a passing (or block-free) turn is seen, so each fresh
# over-budget episode starts counting from zero.
tmpdir="${TMPDIR:-/tmp}"
key="$(printf '%s' "$transcript" | cksum 2>/dev/null | awk '{print $1}')"
[ -n "$key" ] || key="fallback"
counter="$tmpdir/handsfree-goal-budget-$key.count"

# Pull the text of the LAST assistant message from the JSONL transcript.
last_text="$(jq -rs '
  [ .[] | select(.type == "assistant") ] | last | .message.content as $c
  | if ($c | type) == "array"
    then ([ $c[] | select(.type == "text") | .text ] | join("\n"))
    else ($c // "")
    end
' "$transcript" 2>/dev/null)"

[ -n "$last_text" ] || exit 0

# Only act when this turn actually emitted a /goal block. Otherwise clear any
# stale counter and no-op.
printf '%s' "$last_text" | grep -Eq '^[[:space:]]*/goal[[:space:]]*\[' || { rm -f "$counter" 2>/dev/null; exit 0; }

# Run the same budget gate the skill uses. Exit 1 == over the hard ceiling.
result="$(printf '%s' "$last_text" | bash "$CHECKER" 2>&1)"
code=$?

if [ "$code" -ne 1 ]; then
  # PASS, WARN (within ceiling), or unparseable — the episode is resolved.
  rm -f "$counter" 2>/dev/null
  exit 0
fi

# Over the hard ceiling. Read + increment the retry counter.
tries=0
[ -f "$counter" ] && tries="$(cat "$counter" 2>/dev/null || echo 0)"
case "$tries" in ''|*[!0-9]*) tries=0 ;; esac
tries=$(( tries + 1 ))
printf '%s' "$tries" > "$counter" 2>/dev/null

# Bounded: after MAX_RETRIES forced passes, give up blocking so we never wedge
# the session. Leave the counter cleared for the next episode.
if [ "$tries" -gt "$MAX_RETRIES" ]; then
  rm -f "$counter" 2>/dev/null
  exit 0
fi

# First line of the checker output carries the char count + overage.
detail="$(printf '%s' "$result" | head -n1)"

# Escalate after the first line-level pass fails: if trimming words isn't closing
# the gap, the goal is structurally too big for 4000 chars — point at the fix.
if [ "$tries" -ge 2 ]; then
  extra=" This is forced retry ${tries}/${MAX_RETRIES}; line-level trimming is not closing the gap, so make a STRUCTURAL cut instead: spawn a sub-agent to write the full milestone/subtask detail to a goal-plan.md file on disk, then replace the inline MILESTONES with a lean spine plus a 'PLAN FILE:' pointer so the block itself stays under budget (see references/goal-spec.md -> 'Large goals: externalize detail to a plan file')."
else
  extra=""
fi

reason="Budget gate failed before stopping — ${detail} Compress the /goal block (cut or merge non-essential subtasks first; keep the canonical EXECUTION MODE and LEAD blocks verbatim; never truncate mid-structure), then re-emit a block that passes scripts/check-goal-budget.sh.${extra} Do not stop until it is under the 4000-character ceiling."
jq -n --arg r "$reason" '{decision: "block", reason: $r}'
exit 0
