# Project learning path

This is the maturity path for an agent-assisted project. Move forward when the evidence for the current stage is real; do not unlock more autonomy merely because a tool is available.

## Stage 0 — Baseline

Fill `docs/project-brief.md`, `docs/project-commands.md`, `docs/architecture.md`, and the threat boundaries. Acceptance: a new agent can state what the project is, how to verify it, and what it must not touch.

## Stage 1 — Continuity

Run the plan/implement/verify/review loop and create `./scripts/project compact <slug>` snapshots. Acceptance: another agent can resume from `docs/state/handoff.md` without replaying chat history.

## Stage 2 — Evidence

Record tests, failures, decisions, experiments, and retrospectives. Acceptance: every meaningful change has a reproducible command and a rollback path.

## Stage 3 — Research

Maintain dated comparisons in `docs/research/`, recheck external patterns, and record what was adopted or rejected. Acceptance: new ideas are source-backed and do not silently become policy.

## Stage 4 — Specialists

Create bounded role cards for the work the project actually needs. Start with read-only research and verification. Acceptance: each role declares inputs, outputs, authority, evidence, and risk boundaries.

## Stage 5 — Governed learning

Draft proposals under `docs/state/proposals/` or `docs/upgrades/proposals/`; a designated reviewer promotes only evidence-backed changes. Acceptance: promotion appears in `docs/verification-log.md` and has rollback.

## Stage 6 — Measured autonomy

Only after the earlier stages are stable, consider optional runtime orchestration, scheduling, retrieval, or external services. Add budgets, termination conditions, isolation, approval gates, and adversarial evaluations first. Acceptance: autonomy is bounded, observable, reversible, and no broader than the project owner authorized.

## Metrics worth tracking

- time for a fresh agent to reach the first correct verified change;
- percentage of completed tasks with a compaction snapshot and evidence;
- repeated failures prevented by a promoted lesson;
- upgrade proposals accepted/rejected with reasons;
- specialist tasks completed without scope or security exceptions;
- verification failures, rollback frequency, and unresolved risks.
