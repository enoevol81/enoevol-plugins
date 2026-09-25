# Design Steward evals

Behavior tests for `claude plugin eval`. Run them from the `design-steward/` folder.

- `routing/`: requests worded the way a user would say them. Each case checks that
  the right skill loads, or, for the two negative cases, that none does.
- `functional/`: realistic tasks on the example fixture, graded on the result.
  They need `--scaffold`, which runs each case's `setup.sh` to copy `_fixture/`
  into the empty run workspace.

On Windows there is no shell sandbox, so skip the cases tagged `needs-bash`:

```bash
claude plugin eval . --trust-plugin --tag routing --ablation none --no-publish -j 4
```

```bash
claude plugin eval . --trust-plugin --tag core --scaffold --allow-tools Write Edit --no-publish -j 4
```

On WSL2, macOS, Linux or CI, run everything:

```bash
claude plugin eval . --trust-plugin --scaffold --allow-tools Write Edit "Bash(python *)" "Bash(python3 *)" --no-publish -j 4
```

Routing runs with the baseline off, because a skill-loaded check can only pass
with the plugin installed. Routing cases stop at 4 turns on purpose, so a
"Reached maximum number of turns" note on them is expected. Results are written to
`evals/results/`, which git ignores.

Not covered here: live browser review (needs Claude in Chrome), visual
verification, and Cut Weight's external archive, which sits outside the run
sandbox.
