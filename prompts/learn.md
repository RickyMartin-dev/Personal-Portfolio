# Learn prompt

Read `AGENTS.md` before recording durable project knowledge.

After a meaningful change, identify only knowledge that will remain useful after the task leaves memory.

- Record a chosen alternative and its consequences in `docs/decisions/`.
- Record a recurring practice or failure pattern in `docs/lessons.md`.
- Record a bounded milestone's process improvements in `docs/retrospectives/`.
- Update `docs/architecture.md` if ownership or data flow changed.

Keep entries concise, dated, evidence-backed, and free of secrets or transient chat details. Remove stale guidance rather than accumulating it.

## Friction loop

- At finish, record problems and user corrections in `docs/state/friction.md` with `./scripts/project friction "<area>" "<symptom>" "<cause>" "<fix>"`, or pass `--friction "area|symptom|cause|fix"` to `./scripts/project finish`.
- Run `./scripts/project learn` to group friction by area; areas with two or more unresolved entries get a draft proposal in `docs/state/proposals/`.
- Record approved lessons in `docs/lessons.md` as `YYYY-MM-DD — lesson — evidence — check: <script or "none: reason">`, and mark the matching friction entries `lesson`.
