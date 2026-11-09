# Experiment log

Add one row per completed improvement experiment. Link to the full record under `docs/experiments/runs/`.

| ID | Date | Hypothesis | Baseline | Result | Decision | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-title-rendering | 2026-09-23 | Literal rendering preserves normal plan titles. | `sed` replacement was unsafe for `&` and `/`. | `A&B / C` rendered exactly and checks passed. | Kept | [`run`](runs/2026-09-title-rendering.md) |
