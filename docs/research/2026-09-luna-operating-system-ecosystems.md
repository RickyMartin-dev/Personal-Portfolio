# Luna research: agentic starter ecosystems

- Date: 2026-09-24
- Agent: Luna xhigh research pass
- Status: complete; read-only

## Finding

Build a small repository-native protocol rather than a framework. Keep `AGENTS.md` a short map, put durable detail in `docs/`, use fresh worker/critic contexts with measurable acceptance, isolate parallel changes with Git worktrees, and keep Codex, Claude Code, Cursor, OpenHands, and future tools behind optional adapters.

## Compared sources

- [firstmate](https://github.com/kunchenguid/firstmate): strong ownership boundaries, scout/ship separation, isolated worktrees, restart-safe state; too harness-specific to copy as a runtime.
- [Karpathy autoresearch](https://github.com/karpathy/autoresearch): fixed-budget experiments, one metric, and keep/discard history; its GPU/training assumptions do not generalize.
- [OpenAI Codex AGENTS guidance](https://developers.openai.com/codex/guides/agents-md/): hierarchical, scoped instructions; adapters still need behavior verification.
- [OpenAI Codex repository](https://github.com/openai/codex/blob/main/AGENTS.md): executable checklists and scoped validation; repository-specific rather than a universal contract.
- [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/): short maps plus structured docs; avoid an unmaintained documentation encyclopedia.
- [Claude memory](https://code.claude.com/docs/en/memory): concise root instructions and topic files; machine-local auto-memory must not be canonical project memory.
- [Cursor rules](https://cursor.com/docs/rules): path-scoped rules and progressive disclosure; `.mdc` remains vendor-specific.
- [AgentLoop](https://github.com/aiedwardyi/AgentLoop): fresh worker/critic cycle with bounded filesystem memory; daemon/dashboard runtime is optional complexity.
- [OpenHands SDK](https://github.com/OpenHands/software-agent-sdk): clean agent/tool/workspace separation; SDK runtime is not a portable starter format.
- [Agent Skills specification](https://agentskills.io/specification): portable `SKILL.md` packages; scripts remain dependency and platform surfaces.

## Recommendations adopted

1. Keep the shared contract small and use indexes for progressive disclosure.
2. Separate project knowledge, task progress, machine state, and credentials.
3. Make every autonomous improvement a bounded experiment with an evaluator.
4. Use role cards and worktree boundaries for parallel work.
5. Validate the starter itself with deterministic checks.
