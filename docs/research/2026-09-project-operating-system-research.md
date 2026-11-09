# Project operating system research and comparison

- Checked: 2026-09-24
- Question: What should a portable starter add so any project can retain context, learn from evidence, compare outside practice, and safely delegate specialist work over time?
- Scope: repository-local documentation, agent instruction surfaces, research, experiments, specialist briefs, and deterministic checks.
- Excluded: hidden model training, global memory, mandatory runtime frameworks, uncontrolled agent spawning, auto-approval, and credential-bearing services.

## Comparison matrix

| Repository or source | Strong pattern | Limitation for a universal starter | Adopted here |
| --- | --- | --- | --- |
| [firstmate](https://github.com/kunchenguid/firstmate) | Single liaison, scout/ship separation, isolated worktrees, restart-proof state | Runtime/backends and host orchestration are machine-specific | Specialist briefs, scout reports, explicit boundaries |
| [Karpathy autoresearch](https://github.com/karpathy/autoresearch) | Tiny control surface, fixed budget, one metric, keep/discard experiments | Specialized to ML training and a single-GPU loop | Bounded experiments, evidence, and upgrade proposals |
| [noetl agentic-template](https://github.com/noetl/agentic-template) | Git-backed memory, shared instructions, handoffs, initializer | Multi-repo coordination adds adoption complexity | Compaction snapshots and second-brain indexes |
| [AI Agent Project Template](https://github.com/rumotion/ai-agent-project-template) | One canonical instruction file, lazy memory bank, adapter mirrors, drift checks | Broad tool mirror set needs ongoing maintenance | Small canonical map, native adapters, manifest checks |
| [AgentsMD Kit](https://github.com/TateZhouSiu/agents-md-kit) | Short `AGENTS.md`, context/progress/bugs, plain Markdown portability | Lightweight memory does not define research or promotion governance | Second-brain routing and compaction protocol |
| [Agent Evolution Kit](https://github.com/mahsumaktas/agent-evolution-kit) | Trust-gated memory, maker-checker review, budgets, quarantine, audit trails | Full runtime is much larger than a starter and may imply services | Reviewer-approved promotion and explicit authority limits |
| [agentic-coding-starter-kit](https://github.com/leonvanzyl/agentic-coding-starter-kit) | Plan/split/implement/review/verify project flow | Application stack is opinionated | Keep lifecycle prompts independent of language/framework |
| [agentic-engineering-template](https://github.com/ayee-prashant/agentic-engineering-template) | Requirements → architecture → standards → rules → memory | Prescriptive workflow can be too rigid across domains | Keep required artifacts, allow project-specific sequencing |
| [agentic-engineering-starter-pack](https://github.com/tngwilkins/agentic-engineering-starterpack) | Knowledge directory and model-agnostic adapter idea | Commands and conventions still need project adoption | Research/upgrade indexes and adapter pointers |
| [agent-memory-system](https://github.com/serhii-kucherenko/agent-memory-system) | Progressive path from storage to retrieval and orchestration | Retrieval infrastructure adds runtime and poisoning surface | Start with reviewable Markdown; add retrieval only deliberately |
| [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use) | Least privilege, action review, full-SHA pinning | GitHub-specific | Portable local workflow audit plus CI |
| [OWASP LLM risks](https://genai.owasp.org/llm-top-10/) | Excessive agency and instruction/data boundary risks | Risk taxonomy is not an implementation | Trust fixtures, reviewer gates, and no hidden authority |

## Recommendation

Adopt a contract-first, repository-local operating system: small shared instructions, lazy-loaded second-brain documents, generated compaction snapshots, fresh comparison reports, deterministic upgrade suggestions, and reviewer-approved specialist role cards. Add runtime orchestration, retrieval, scheduling, or external memory only when a project documents the authority, budget, security, and rollback boundaries.

## Decisions

1. **Git is the memory boundary.** It is inspectable, branchable, portable, and naturally tied to the code version it explains.
2. **Compaction is a first-class event.** A generated snapshot captures facts; the agent fills rationale and next actions.
3. **Research is a recurring workflow.** Every report has freshness metadata and an adoption decision rather than becoming unreviewed lore.
4. **Learning is evidence promotion.** Agents may draft lessons, experiments, or upgrade proposals; a designated reviewer promotes the smallest safe change.
5. **Specialists are role cards before runtimes.** A project can route a UI, UX, Python, trading, or domain specialist without granting hidden tools or credentials.
6. **Autonomy is budgeted and reversible.** The starter provides boundaries and checklists; application owners decide whether to add a runtime, network, scheduler, or external memory.

## Recheck triggers

- A supported agent changes its instruction or command discovery behavior.
- A project adds credentials, networked tools, production deployment, or autonomous scheduling.
- A memory proposal is promoted without reproducible evidence.
- A comparison source changes license, security model, or repository architecture.

## Research method

Sources were inspected on 2026-09-24. Search results were used to discover candidates; repository READMEs and official guidance were preferred for claims. The three Luna xhigh research passes are preserved as separate reports and were used as an independent critique of this synthesis.
