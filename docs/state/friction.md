# Friction log

Append-only record of session problems and user corrections. Keep entries sanitized: no secrets, customer data, or transcripts. Add entries with `./scripts/project friction`; use `./scripts/project finish --friction` to record a correction at task completion. Run `./scripts/project learn` to draft proposals for repeated areas.

Entry format (one per line, parsed by tools; do not reorder fields):

`- YYYY-MM-DD | <area> | <symptom> | <cause> | <fix> | <status>`

`<area>` is a short kebab-case slug. `<status>` is `open`, `fixed`, or `lesson`.

## Log
- 2026-11-08 | upstream-sync | The previous local source reference was behind upstream | The repository state recorded an older starter revision | Verified current main at 5bed5a1 and integrated its reusable changes | fixed
