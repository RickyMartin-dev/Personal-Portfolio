# Research: Agentic Starter Repositories

Research snapshot: 2026-09-23. Links are included so this document can be re-checked as tool behavior changes.

## Patterns worth carrying forward

### kunchenguid/firstmate

Repository: https://github.com/kunchenguid/firstmate

Firstmate treats a cloned repository as an agent distribution: instructions, skills, policies, state conventions, and helper scripts travel with the project. Its strongest ideas for a general starter are a single liaison contract, separate research (“scout”) and delivery (“ship”) work, disposable worktrees for parallel changes, and a deliberate split between internal agent material and public reusable skills.

This template adopts the portable parts—clear roles, bounded research, explicit verification, and worktree guidance—without shipping a supervisor runtime, terminal multiplexer integration, or machine-specific state.

### Karpathy/autoresearch

Repository: https://github.com/karpathy/autoresearch

Autoresearch makes the agent-facing control surface tiny: a small program document directs repeated experiments while the code under test has a fixed time budget and a measurable objective. The transferable pattern is a constrained modification surface plus a repeatable keep/discard loop and durable experiment history.

This template applies that idea to software delivery through small plans, explicit acceptance criteria, bounded checks, and lessons. It does not assume GPUs, a training loop, or an autonomous overnight process.

### OpenAI Codex guidance and cookbook

References:

- https://openai.com/index/harness-engineering/
- https://developers.openai.com/api/docs/guides/latest-model
- https://github.com/openai/openai-cookbook/blob/main/examples/codex/iterating-development-workflows-with-codex.md

The recurring recommendation is to make `AGENTS.md` a short map, not a massive manual, and keep the system of record in structured documentation. The cookbook's goals/plans/prompts/context pattern also makes phase state visible and repeatable.

This template therefore keeps root instructions under roughly 100 lines and routes detail into `docs/`, `prompts/`, and scoped nested instructions.

### Cursor rules and commands

References:

- https://docs.cursor.com/context/rules
- https://docs.cursor.com/en/cli/using
- https://docs.cursor.com/en/agent/chat/commands

Cursor supports version-controlled project rules under `.cursor/rules/`, scoped rule application, and reusable Markdown commands under `.cursor/commands/`. Cursor CLI also reads `AGENTS.md` and `CLAUDE.md`, which makes a shared repository contract practical.

This template uses one always-on adapter rule and a few commands that point back to shared prompts. It avoids duplicating the full contract in tool-specific files.

### Comparable starter templates

Additional repositories reviewed during the design pass:

- Vercel Labs coding-agent-template: https://github.com/vercel-labs/coding-agent-template — useful for executable repository guidance, architecture maps, and exact validation commands; its hosted product infrastructure is intentionally not part of this general starter.
- Microsoft agentic-agile-template: https://github.com/microsoft/agentic-agile-template — useful for acceptance criteria, guided onboarding, and explicit project state; its prescribed dialogue is too rigid as a universal default.
- Agents-Memory: https://github.com/haochencheng/Agents-Memory — useful for separating durable memory from runtime state and for making documentation/plan checks mechanical.
- Agent-Context: https://github.com/lx-wnk/Agent-Context — useful for layered context and keeping always-loaded guidance small.

These comparisons led to the same boundary: ship the contract, artifacts, and deterministic checks; keep provider-specific orchestration and machine state opt-in.

## Deliberate exclusions

- No mandatory framework, language, package manager, database, or cloud provider.
- No MCP server configuration that could silently add external authority or credentials.
- No hooks that execute automatically or bypass approvals.
- No hidden memory database: durable knowledge remains reviewable Markdown.
- No orchestration daemon: parallel agents should use the harness's native worktree or branch isolation.
- No claim that every agent reads every adapter identically; the shared docs are the portable fallback.

## Resulting design

The starter combines:

1. `AGENTS.md` as the cross-agent map.
2. `CLAUDE.md` and `.cursor/` as thin native adapters.
3. `docs/` as the durable system of record.
4. `prompts/` and templates as repeatable operating procedures.
5. `scripts/project` as a small, inspectable local control surface.
6. GitHub quality automation that validates the starter contract without assuming an application stack.
