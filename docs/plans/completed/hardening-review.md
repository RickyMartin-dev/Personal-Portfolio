# Plan: Review and tighten starter hardening checks

- Owner: project-starter maintainer
- Created: 2026-09-23
- Status: complete
- Scope: validate and tighten the repository-local hardening checks without expanding runtime or permissions

## Goal

The starter's security and instruction-surface checks should reject representative unsafe inputs for the intended reason, while remaining dependency-free and portable.

## Non-goals

- No application runtime, hosted scanner, remote memory service, or workflow permission expansion.
- No changes to the repository's product placeholders beyond documentation needed to explain the checks.

## Assumptions and decisions needed

- Treat the existing uncommitted hardening pass as the intended implementation and preserve its scope.
- Prefer deterministic shell checks and negative fixtures over adding a parser or external dependency.

## Steps

- [x] Review hardening scripts and fixtures for false-green or false-negative paths.
- [x] Patch the release gate so staged changes are included, tighten manifest contract checks, and keep the docs and adapters aligned.
- [x] Run the documented starter and release checks, inspect the diff, and record evidence.

## Acceptance criteria

- [x] The adversarial fixture is stored and copied at the path the instruction-surface check actually validates.
- [x] Negative cases fail for their targeted reason and all positive checks remain green.
- [x] The release gate checks staged and unstaged tracked changes relative to `HEAD`.
- [x] No secrets, permissions, network access, or hidden orchestration are introduced.

## Verification

```bash
./scripts/project check
./scripts/project release-check
git diff --check
```

## Risks and recovery

- Risk: shell heuristics can be incomplete; keep the checks narrow and document that they are not a full security scanner. Recovery: revert only the focused script, fixture, and plan changes.
