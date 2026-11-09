# Retrospectives

Store short retrospectives for meaningful milestones or incidents. Use [`../templates/retrospective.md`](../templates/retrospective.md).

Run `./scripts/project retro [YYYY-MM] [--html] [--json]` to generate the monthly retrospective `docs/retrospectives/YYYY-MM.md` from snapshots, the friction log, lessons, proposals, and the verification log. It refuses to overwrite an existing file unless you pass `--force`, and it only lists retire and rollup candidates; it never deletes or moves anything. `--html` also writes `.lavish/retro-YYYY-MM.html`.
