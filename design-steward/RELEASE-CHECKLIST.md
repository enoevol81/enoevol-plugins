# Release evidence

Local implementation is distinct from public submission and reviewer approval.

- Validate all four plugin manifests and skill frontmatter.
- Verify the curated build matches canonical sources.
- Run ledger dependency, stale-evidence and recovery regressions.
- Test source baselines against added/deleted/changed and excluded files.
- Test overlay note/drawing/edit export, reload/reinject, import rejection,
  ambiguous anchors, storage failure, and no automatic edit replay.
- Exercise the example at desktop and mobile sizes and preserve evidence.
- Record any missing live Claude-in-Chrome or model-driven acceptance evaluation.
- Include MIT license and installation requirements.
- Submit only after reviewing the tested release; do not equate local validation
  with Anthropic approval. No public submission is performed by the build script.
