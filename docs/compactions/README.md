# Compaction snapshots

Compaction snapshots preserve the project context that would otherwise be lost when an agent session ends or a context window is summarized. They are append-only historical records; the current truth remains in the live project documents.

Create one with:

```bash
./scripts/project compact after-api-migration
```

Then fill the generated sections for decisions, evidence, unfinished work, and next actions. Never copy secrets, tokens, customer data, or raw untrusted prompts into a snapshot.

Each snapshot should identify:

- date, branch, commit, and working-tree state;
- project brief, architecture, commands, and quality references;
- active plans, risks, bugs, experiments, research, and upgrade proposals;
- what changed, what was verified, what remains uncertain, and the next safe action.

The optional shared archive stores concise summaries and repository facts in a user-selected vault. Keep `.agent-state/second-brain-checkpoint.md` current at meaningful milestones for Codex pre-compaction hooks. Never copy full agent transcripts or raw untrusted payloads into the archive.
