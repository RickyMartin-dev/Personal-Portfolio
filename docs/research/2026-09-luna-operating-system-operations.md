# Luna research: project operations and presentations

- Date: 2026-09-24
- Agent: Luna xhigh research pass
- Status: complete; read-only

## Finding

The strongest portable design is a language-neutral `.agentic/manifest.json`, versioned `docs/`, append-only historical snapshots with small current-state projections, typed research/plan/experiment/review/promotion records, scoped specialist roles, deterministic checks around nondeterministic work, and optional HTML/Lavish artifacts that never replace Markdown or JSON as the source of truth.

## Compared sources

- [firstmate](https://github.com/kunchenguid/firstmate): liaison, scout/ship tasks, worktrees, durable state; borrow ownership and recovery concepts, not the fleet runtime.
- [Karpathy autoresearch](https://github.com/karpathy/autoresearch): fixed budget, metric, checkpoint, and keep/reject; copy the protocol, not the ML implementation.
- [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/): indexed docs, plans, decisions, and doc-gardening; keep `AGENTS.md` a map.
- [AGENTS.md](https://agents.md/): portable root and nested instruction conventions; it does not define permissions or promotion governance.
- [PromptPasture agent.md](https://github.com/PromptPasture/agent.md): separate rules, skills, agents, commands, memory, and tasks; reserve `.agentic/` to avoid source-layout collisions.
- [Claude subagents](https://code.claude.com/docs/en/sub-agents): tool scoping, model selection, worktree isolation, and routing descriptions; frontmatter remains vendor-specific.
- [Cursor subagents](https://cursor.com/docs/subagents): context isolation and parallel specialist work; automatic delegation needs a routing contract.
- [Anthropic skills](https://github.com/anthropics/skills): on-demand `SKILL.md` packages; skills are executable instruction surfaces and must be reviewed.
- [GitHub Agentic Workflows](https://github.com/github/gh-aw): Markdown workflows, typed frontmatter, read-only jobs, and safe outputs; preview-stage and GitHub-specific.
- [Lavish](https://github.com/kunchenguid/lavish-axi): local HTML annotation and feedback; visual artifacts must point back to authoritative repository records.

## Recommendations adopted

1. Add compaction snapshots that capture facts automatically and rationale explicitly.
2. Add a research register with freshness and recheck triggers.
3. Add deterministic upgrade suggestions instead of autonomous policy edits.
4. Add specialist role cards and a guarded factory prompt.
5. Add a committed Lavish architecture/presentation artifact for review and onboarding.
