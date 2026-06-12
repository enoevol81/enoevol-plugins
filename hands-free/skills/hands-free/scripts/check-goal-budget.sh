#!/usr/bin/env bash
# check-goal-budget.sh — hard size gate for an emitted /goal [...] block.
#
# The hands-free skill's budget rules are advisory; this script makes them
# enforceable. Run it on the final block BEFORE presenting it to the user. If it
# exits non-zero, the block is over the hard ceiling — compress and re-run until
# it passes. Never emit a block that has not passed this check.
#
# Usage:
#   scripts/check-goal-budget.sh goal.txt        # check a file
#   scripts/check-goal-budget.sh < goal.txt      # check stdin
#   pbpaste | scripts/check-goal-budget.sh       # check clipboard
#
# It isolates the block from `/goal [` through its matching closing `]` (so any
# surrounding summary / "Run it headless" prose is excluded, matching the spec),
# then counts characters of just that block.
#
# Exit codes:
#   0  PASS  (<= 3500 target, or <= 4000 with a warning)
#   1  FAIL  (> 4000 hard ceiling — must compress)
#   2  usage / no /goal block found

set -euo pipefail

TARGET=3500
CEILING=4000

# --- read input (file arg or stdin) ---------------------------------------
if [ "$#" -gt 1 ]; then
  echo "usage: check-goal-budget.sh [FILE]   (or pipe the block on stdin)" >&2
  exit 2
elif [ "$#" -eq 1 ]; then
  if [ ! -f "$1" ]; then
    echo "error: no such file: $1" >&2
    exit 2
  fi
  input="$(cat -- "$1")"
else
  input="$(cat)"
fi

# --- isolate the /goal [ ... ] block --------------------------------------
# Take from the first line that starts with `/goal [` through the next line
# that is a lone `]`. If no fenced block markers are needed; we match on the
# goal syntax itself so it works whether or not it's inside ``` fences.
block="$(printf '%s\n' "$input" | awk '
  /^[[:space:]]*\/goal[[:space:]]*\[/ { f=1 }
  f { print }
  f && /^[[:space:]]*\][[:space:]]*$/ { exit }
')"

if [ -z "$block" ]; then
  echo "FAIL: no /goal [ ... ] block found in input." >&2
  echo "      (Expected a line starting with '/goal [' and a closing ']'.)" >&2
  exit 2
fi

# --- count characters (the metric the 4000 limit is measured in) ----------
# Use wc -m (characters), trimming the trailing newline awk adds.
count="$(printf '%s' "$block" | wc -m | tr -d '[:space:]')"

# --- report ----------------------------------------------------------------
if [ "$count" -gt "$CEILING" ]; then
  over=$(( count - CEILING ))
  echo "FAIL: /goal block is ${count} chars — ${over} over the ${CEILING} hard ceiling."
  echo "      Compress (cut/merge non-essential subtasks first; keep EXECUTION MODE + LEAD verbatim) and re-run."
  exit 1
elif [ "$count" -gt "$TARGET" ]; then
  over=$(( count - TARGET ))
  echo "WARN: /goal block is ${count} chars — ${over} over the ${TARGET} target (under the ${CEILING} ceiling)."
  echo "      Acceptable, but trim toward ${TARGET} for headroom if quick."
  exit 0
else
  echo "PASS: /goal block is ${count} chars (<= ${TARGET} target, ceiling ${CEILING})."
  exit 0
fi
