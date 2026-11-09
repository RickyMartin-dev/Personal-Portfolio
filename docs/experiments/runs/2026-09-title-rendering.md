# Experiment: Literal-safe plan title rendering

- ID: 2026-09-title-rendering
- Date: 2026-09-23
- Owner: project-starter maintainer
- Status: kept

## Question

Can the plan generator accept normal human titles without treating shell replacement characters as syntax?

## Baseline

- Current behavior or value: direct `sed` replacement can interpret characters such as `&` and `/` in a title.
- Evaluator: `./scripts/project plan title-edge 'A&B / C'` followed by inspection of the generated heading and `bash -n`.
- Budget: one focused script change and one edge-case run.

## Hypothesis

If the generator renders the title as a literal shell value rather than a `sed` replacement, then `A&B / C` will be preserved exactly and the normal starter checks will continue to pass.

## Change

Replace replacement-string interpolation with a line-by-line renderer that only substitutes the known template markers and prints the user-provided title as data.

## Result

- Observed value: the generated heading was exactly `# Plan: A&B / C`; the starter check and Bash syntax checks passed.
- Evidence: `scripts/project`, `scripts/check-starter.sh`, and the verification log.
- Unexpected effects: none observed.

## Decision

Keep. The literal renderer removes a real portability failure without adding a dependency or changing the public command shape.
