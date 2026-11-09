# Scout report: portable agentic project starter

- Date: 2026-09-23
- Scout: project-starter research pass
- Status: complete
- Requested by: starter repository build brief

## Intake contract

- Question to answer: Which patterns from agentic coding repositories are safe and useful in a general-purpose starter for Codex, Claude Code, and Cursor?
- Out of scope: implementing an agent supervisor, provider-specific runtime, or application framework.
- Sources or files to inspect: firstmate, Karpathy's autoresearch/nanoGPT ecosystem, OpenAI Codex guidance and cookbook, Cursor rules/commands documentation, and comparable starter templates.
- Decision deadline or handoff: before the initial repository commit.

## Findings

- firstmate is an agent distribution with strict role boundaries, scout-versus-ship work, isolated worktrees, and explicit state separation. Its fleet runtime is too machine-specific for a universal base.
- Karpathy's autoresearch shows the value of a small control surface, fixed budgets, stable evaluators, measurable outcomes, and keep/discard history.
- OpenAI's Codex guidance favors a short `AGENTS.md` map backed by structured repository knowledge rather than a giant instruction manual.
- Cursor provides scoped `.cursor/rules/` and reusable `.cursor/commands/`; Claude Code can use a thin `CLAUDE.md` import plus scoped rules. A shared Markdown contract is more portable than duplicated policy.
- A safe baseline should keep MCP, hooks, auto-approval, credentials, and orchestration runtimes opt-in.

## Recommendation

Ship a contract-first starter: one shared map, durable docs, thin native adapters, deterministic checks, reusable plan/review/research prompts, explicit security boundaries, and small experiment and verification records. Add orchestration only after the single-agent lifecycle is reliable.

## Handoff

- Suggested owner: project maintainer
- Follow-up plan or issue: customize `docs/project-brief.md`, `docs/project-commands.md`, and `docs/architecture.md` in each adopted project.
- No code was changed during the research phase: `yes`
