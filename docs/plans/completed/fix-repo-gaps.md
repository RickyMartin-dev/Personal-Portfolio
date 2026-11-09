# Plan: Fix Project Starter gaps and push to main

- Owner: Codex
- Created: 2026-11-08
- Status: completed
- Scope: Correct the six walkthrough findings, make Project Starter self-documenting, verify the changes, and push them to `origin/main`.

## Goal

The upgrade signals, hook setup, snapshot redaction, presentation workflow routing, and CLI lifecycle coverage work as documented; project docs describe this repository; the complete result is committed and pushed to `main`.

## Non-goals

- Adding application code, runtime orchestration, stale-record thresholds, or automatic proposal review.

## Assumptions and decisions needed

- When no custom Git hook path is configured, use `.githooks`; preserve any configured custom path.
- Keep the manifest's `present` workflow ID and provide the missing prompt and provider command surfaces.
- Commit the already-present walkthrough report and task history together with the fixes, as requested by “push latest changes.”

## Steps

- [x] Fix record detection and align presentation claims; protect behavior with fixtures.
- [x] Preserve custom Git hook paths and test default, custom, and failed setup cases.
- [x] Align snapshot sanitizers with scanner token patterns and test both Bash and Python paths.
- [x] Add the `present` prompt and Claude/Cursor command adapters; validate the surfaces.
- [x] Fill repository identity, commands, architecture, next-task, and related onboarding/backlog docs.
- [x] Update the walkthrough report and run the full project release gate.
- [x] Commit and push the reviewed changes to `origin/main` (`63f6dec`).
- [x] Fix trailing whitespace in summaries sanitized by `finish`; protect the generated handoff in the CLI fixture.
- [x] Run the full gate, finish successfully, archive the final task snapshot, and push the final handoff.

## Acceptance criteria

- [x] All six findings are resolved or explicitly clarified; `doctor --json` reports no project placeholders; project and fixture checks pass; final snapshot is archived and the changes reach `origin/main`.

## Verification

```bash
./scripts/project check
./scripts/project release-check
./scripts/project doctor --json
./scripts/project suggest-upgrades --json
./scripts/project finish --summary "Closed Project Starter walkthrough gaps"
git diff --check HEAD --
```

- Result: `./scripts/project release-check` passed; `doctor --json` reports `placeholderWarnings:false`; `suggest-upgrades --json` reports only the expected proposal and specialist signals; `./scripts/project finish` passed and confirmed the snapshot was archived; implementation commit `63f6dec` is on `origin/main`.

## Risks and recovery

- Direct push is explicitly requested. If branch protection rejects it, preserve the commit and report the remote blocker without bypassing protections.
