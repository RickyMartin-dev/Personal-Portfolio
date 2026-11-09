# Agent Workflow

This is the repeatable operating system for work in this repository. Adapt the commands and artifacts to the project, but keep the state transitions visible.

The routine path is agent-operated. Begin with `./scripts/project start --task "<request>"` and end with `./scripts/project finish --summary "<outcome>"`. Do not make the user maintain plans, compaction snapshots, handoffs, or upgrade suggestions by hand.

## 1. Orient

Read `AGENTS.md` and the task-relevant parts of `docs/project-brief.md`. Read `docs/project-commands.md` before running checks, `docs/architecture.md` when changing boundaries or data flow, and the relevant plan or decision when one exists. Search before assuming. Identify the smallest set of files that can solve the request.

## 2. Plan

For work larger than a trivial edit, create a plan with:

- the problem and non-goals;
- assumptions and open decisions;
- implementation steps in dependency order;
- acceptance criteria;
- exact verification commands;
- rollback or recovery notes for risky changes.

Keep plans executable. A plan is not a second requirements document.

## 3. Implement

Make one coherent change at a time. Prefer existing patterns and dependencies. Keep user-facing behavior, documentation, tests, and configuration in sync. Do not broaden scope because an adjacent improvement is interesting.

## 4. Verify

Run the narrowest useful check after each meaningful change, then the full documented gate before completion. Test failure paths, not just the happy path. If a check cannot run, say why and provide the next best evidence.

## 5. Review

Review the diff as if you did not write it. Look for broken assumptions, missing tests, unsafe input handling, secret leakage, migration hazards, compatibility issues, and unnecessary complexity. A second agent can review, but the owner remains responsible for the decision.

## 6. Learn

Capture durable outcomes only:

- use `docs/decisions/` for choices with alternatives and consequences;
- use `docs/lessons.md` for recurring practices and failure patterns;
- use `docs/retrospectives/` for a bounded project's what/why/next time;
- update `docs/architecture.md` when the system map changes.

Do not turn every conversation into permanent context. Delete stale guidance.

## Research and improvement loops

Use a scout report for bounded research and a ship plan for authorized changes. Scouts return evidence, alternatives, and a handoff; they do not quietly edit production code. Ship work has an owner, acceptance criteria, and verification evidence.

For improvements to code, prompts, or process, use the experiment loop in `docs/experiments/`: baseline → hypothesis → bounded run → measure → keep or discard/revert. Keep the evaluator stable, record the result, and promote only evidence-backed lessons. Append durable verification evidence to `docs/verification-log.md`.

## 7. Compact and recover

Before a long session ends, a context window compacts, or work moves between agents, run `./scripts/project finish --summary "<outcome>"`. This automatically creates a fact-based snapshot and updates `docs/state/automatic-handoff.md`. Use `./scripts/project compact <slug>` when a named, hand-authored snapshot is needed. Facts are generated from the repository; interpretation remains explicitly authored.

## 8. Research and suggest upgrades

Use `./scripts/project research <slug> "<question>"` for a dated comparison of current practice. Use `./scripts/project suggest-upgrades --json` to surface deterministic signals such as placeholders, missing compaction history, or absent proposals. Create a proposal with `./scripts/project upgrade <slug> "<title>"`, then require evidence before promotion. Suggestions never edit the repository by themselves.

## Project logic refresh

For a combined freshness pass, use `/update-project-logic` in Claude Code or `$update-project-logic` in Codex. It checks verified project learning, relevant skills/docs/hooks, concrete improvement and security evidence, and current official AI-development practice. It refreshes low-risk project guidance and reports prioritized follow-up work; it does not silently change application behavior or global agent settings.

## 9. Route specialist work

Use `./scripts/project specialist <slug> "<role>"` to draft a bounded Markdown role card. A coordinator may hand it to Codex, Claude Code, Cursor, or another harness, but only after a reviewer confirms inputs, outputs, write scope, evidence, rollback, and trust boundaries. Specialist cards are portable interfaces; they are not automatic permission to spawn agents or install tools.

## 10. Promote learning

Use `docs/state/proposals/` for project-specific improvement proposals. The designated reviewer agent may approve a proposal only after checking its evidence, scope, rollback, secret safety, and prompt-injection boundary. Apply the smallest durable change and record the evidence in `docs/verification-log.md`.

## 11. Complete

Confirm acceptance criteria, move the plan to `docs/plans/completed/`, update the changelog when appropriate, and report verification evidence plus known limitations.

## Parallel work

Parallelize independent research or review. Give each worker a narrow output contract. Isolate concurrent code changes with git worktrees or separate branches. Merge only after each result has a named owner, a reviewable diff, and passing verification. Keep scout reports separate from ship branches until a human or task owner authorizes implementation.
