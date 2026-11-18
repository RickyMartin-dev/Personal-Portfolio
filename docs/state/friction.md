# Friction log

Append-only record of session problems and user corrections. Keep entries sanitized: no secrets, customer data, or transcripts. Add entries with `./scripts/project friction`; use `./scripts/project finish --friction` to record a correction at task completion. Run `./scripts/project learn` to draft proposals for repeated areas.

Entry format (one per line, parsed by tools; do not reorder fields):

`- YYYY-MM-DD | <area> | <symptom> | <cause> | <fix> | <status>`

`<area>` is a short kebab-case slug. `<status>` is `open`, `fixed`, or `lesson`.

## Log
- 2026-11-08 | upstream-sync | The previous local source reference was behind upstream | The repository state recorded an older starter revision | Verified current main at 5bed5a1 and integrated its reusable changes | fixed
- 2026-11-18 | github-actions | PR #52 shows no CI checks and no workflow run for its head commit despite active pull_request workflows | GitHub API confirms zero commit workflow runs; PR remains open and unmerged to avoid bypassing the gate | Investigate why PR workflows did not trigger before merge | open
