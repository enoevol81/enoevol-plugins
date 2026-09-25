# Hands Free

Plan, execute, and resume multi-step work using the tools available in the host.
Three skills: `hands-free` (plan), `execute` (run), and `resume` (recover progress).
Single-agent operation works without Mission Control or a /goal consumer.

## Install

```text
/plugin marketplace add enoevol81/enoevol-plugins
/plugin install hands-free@enoevol-plugins
```

Requires Python 3 for the portable run ledger. Ask "Plan this outcome", "Execute
this plan", or "Resume the interrupted run". Work is recorded in
`.hands-free/<run-id>/`; completion requires evidence files and an observed result.
Changed evidence invalidates dependent completion on resume. The agent evaluates
acceptance criteria; file hashes alone cannot prove correctness.

Existing permissions and authorization remain binding. No automatic permission
elevation or headless launch. Runtime, spend and token budgets are advisory unless
the host supplies an actual enforcement mechanism.

Legacy /goal prompt export remains opt-in. Its Bash/jq length checker validates a
4000-character compatibility ceiling, not cost or runtime. The old Stop hook is
not registered by default. See `references/execution.md` for commands and schema.
