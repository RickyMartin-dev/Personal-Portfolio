# Second brain

This directory is the navigational layer for the repository's durable project knowledge. It is intentionally plain Markdown so any coding agent, editor, or human can inspect it without a runtime.

## Read by task

| Need | Start here | Then load |
| --- | --- | --- |
| Understand the project | `docs/project-brief.md` | `docs/architecture.md` |
| Resume after compaction | `docs/state/handoff.md` | latest `docs/compactions/*.md` |
| Share task snapshots across repositories | optional `PROJECT_SNAPSHOT_ARCHIVE_ROOT` | vault `raw/project-snapshots/` and its index/log |
| Make a decision | `docs/decisions/README.md` | relevant decision record |
| Run or verify code | `docs/project-commands.md` | `docs/quality.md` |
| Learn from failure | `docs/state/bugs.md` | `docs/lessons.md`, `docs/retrospectives/` |
| Compare outside ideas | `docs/research/README.md` | latest research report |
| Refresh project logic and current AI practice | `/update-project-logic` in Claude Code or `$update-project-logic` in Codex | matching provider-native repo skill |
| Choose next improvement | `docs/upgrades/backlog.md` | `./scripts/project suggest-upgrades` |
| Delegate specialist work | `agents/README.md` | matching role card |

## Freshness rules

- Every research note has a date checked and a recheck trigger.
- Every compaction snapshot links to the commit or working-tree state it describes.
- Every promoted lesson has an evidence row in `docs/verification-log.md`.
- Stale or speculative material is labeled `TBD`, `proposed`, or `unverified`; it is never presented as project policy.

## Index maintenance

When adding a durable document, add one row to the closest index and keep the root `AGENTS.md` map short. Run `./scripts/project check` after changing agent-facing surfaces.
