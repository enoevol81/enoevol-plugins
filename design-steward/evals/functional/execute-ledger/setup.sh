#!/usr/bin/env bash
# Copy the shared fixture into the empty run workspace.
set -euo pipefail
fixture="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../_fixture" && pwd)"
cp "$fixture/DESIGN.md" "$fixture/index.html" .
cat > brief.md <<'BRIEF'
# Brief

Decision (approved by the user): the primary button uses the global 8px radius.

- Issue fixture:note_001: #start uses border-radius 6px; change it to var(--radius).
  Acceptance: computed border-radius of #start is 8px; the mobile full-width rule is unchanged.
BRIEF
