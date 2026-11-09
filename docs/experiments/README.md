# Improvement Experiments

Use this directory for bounded experiments that improve the product, workflow, prompts, checks, or agent collaboration.

Each experiment follows a constrained loop:

1. Record the current baseline and the metric or observable signal.
2. State one falsifiable hypothesis and the smallest change that tests it.
3. Run within a fixed time, cost, or change budget.
4. Measure against the same baseline and record the evidence.
5. Keep the change only when it improves the signal without violating the quality bar; otherwise discard or revert it.
6. Capture the next hypothesis, if any, without silently expanding scope.

Create a run with `./scripts/project experiment <slug> "<title>"`. Store completed records under `docs/experiments/runs/` and summarize durable outcomes in `docs/experiments/log.md` or `docs/lessons.md`.

The evaluator should be as stable as practical. Do not change the measurement and the thing being measured in the same experiment unless that coupling is the point of the experiment.
