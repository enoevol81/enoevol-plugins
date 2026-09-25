#!/usr/bin/env bash
# Copy the shared fixture into the empty run workspace.
set -euo pipefail
fixture="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../_fixture" && pwd)"
cp "$fixture/DESIGN.md" "$fixture/index.html" .
