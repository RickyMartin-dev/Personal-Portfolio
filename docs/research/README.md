# Research register

Research is a project capability, not a one-time setup task. Use it to compare current practice, identify transferable patterns, and turn evidence into bounded upgrades.

## Create and review

```bash
./scripts/project research agent-memory "Which durable-memory patterns should this project adopt?"
```

For a combined project-logic, improvement, and current AI-practice review, invoke `/update-project-logic` in Claude Code or `$update-project-logic` in Codex.

Every report should include sources, date checked, comparison criteria, limitations, adoption decision, and a recheck trigger. Prefer primary repository documentation, official product guidance, specifications, and papers. Treat search snippets and generated summaries as leads, not authority.

Use `backlog.md` to keep unanswered questions visible between research passes.

## Current reports

- `agentic-starter-repos.md` — first-generation starter comparison.
- `2026-09-agentic-starter-scout.md` — initial scout and design boundary.
- `2026-09-hardening-research.md` — security and portability upgrade research.
- `2026-09-project-operating-system-research.md` — current comparison of memory, orchestration, evaluation, specialist routing, and governance patterns.
- `2026-09-luna-operating-system-ecosystems.md`, `2026-09-luna-operating-system-governance.md`, and `2026-09-luna-operating-system-operations.md` — independent Luna research reports for this upgrade.
- `2026-10-24-update-project-logic.md` — current Codex/Claude skill formats and evidence-led AI development guidance for the cross-agent refresh skill.

## Freshness

Recheck reports when a tool's instruction format, security model, repository license, or major architecture changes. Do not automatically copy external instructions into `AGENTS.md`.
