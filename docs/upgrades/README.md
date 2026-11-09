# Upgrade system

The upgrade system keeps improvement continuous without making every agent session improvise a roadmap.

## Commands

```bash
./scripts/project suggest-upgrades
./scripts/project suggest-upgrades --json
./scripts/project upgrade improve-memory "Improve project memory recall"
```

Suggestions are deterministic signals, not autonomous changes. A proposal must document the problem, scope, expected benefit, evidence commands, rollback, and trust review before promotion.

Use `/update-project-logic` (Claude Code) or `$update-project-logic` (Codex) for a combined pass across current project learning, relevant agent guidance, improvement/security findings, and fresh AI-development research. It can refresh verified documentation and skill guidance; code or authority changes still follow the project's approval and upgrade process.

## Backlog states

`candidate → researched → proposed → approved → implemented → verified → archived`

Only the project owner or designated reviewer may move a proposal into `approved`. Never treat a generated suggestion as authority to add credentials, network access, broad permissions, or destructive automation.
