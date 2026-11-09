# Plan: Cross-project snapshot archive

- Owner: Codex
- Created: 2026-10-24
- Status: complete
- Scope: Add optional project-starter snapshot mirroring and configure this user's Codex/Claude workflows to archive snapshots in Ricky-Brain.

## Goal

Codex and Claude Code preserve concise project checkpoints and task outcomes in the user's shared Obsidian vault, and project-starter users can opt into the same behavior without a personal path in the repository.

## Non-goals

- Importing old snapshots or raw transcripts.
- Adding wiki synthesis pages for each snapshot.
- Blocking project work or compaction when the vault is unavailable.

## Decisions

- Archive under `raw/project-snapshots/<project-slug>/`; catalog in `wiki/index.md` and append to `wiki/log.md` when available.
- Capture only concise summaries, agent-maintained checkpoints, and repository facts; redact common credential patterns.
- The starter option is disabled unless `PROJECT_SNAPSHOT_ARCHIVE_ROOT` is set.
- Retry a failed archive write once, warn, and continue.
- Codex's compacted item is opaque to its hook, so capture the maintained checkpoint at pre/post-compaction boundaries. Claude's post-compaction hook can save its native summary.

## Steps

- [x] Add a portable archive helper and checkpoint capture to the starter workflow.
- [x] Document the opt-in archive behavior and add local archive checks.
- [x] Configure this user's global Codex/Claude hooks and instructions, preserving existing hooks.
- [x] Archive the setup task snapshot in Ricky-Brain and review the final diff.

## Acceptance criteria

- [x] Future task snapshots can be archived from any project into the vault and indexed.
- [x] Codex and Claude hooks preserve existing settings and do not block progress.
- [x] Other project-starter users have an optional, path-neutral setup.
- [x] No chat transcripts are copied.

## Verification

```bash
./scripts/check-snapshot-archive.sh
./scripts/project check
./scripts/project release-check
PROJECT_SNAPSHOT_ARCHIVE_ROOT="<configured-vault>" PROJECT_SNAPSHOT_AGENT=codex ./scripts/project finish --summary "Configured optional cross-project snapshot archiving for Codex and Claude Code"
git diff --check
```

## Risks and recovery

- Codex exposes an opaque compaction item; archive the agent-maintained checkpoint instead and surface a warning if it is missing.
- If the local vault is unavailable, keep work moving and retry at the next safe point.
