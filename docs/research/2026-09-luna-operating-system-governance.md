# Luna research: self-improving agent governance

- Date: 2026-09-24
- Agent: Luna xhigh research pass
- Status: complete; read-only

## Finding

“Self-improving” should mean evidence-driven evolution of versioned artifacts—not autonomous model retraining or unrestricted self-modification. Agents may propose changes to prompts, tools, memory, workflows, and policies, but deterministic checks, scoped storage, reviewer approval, and rollback must gate promotion.

## Compared sources

- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents): start with simple workflows; justify evaluator/optimizer or multi-agent complexity with measurable gains.
- [OpenAI Agents](https://developers.openai.com/api/docs/guides/agents): handoffs, sessions, guardrails, human approval, tracing, and evals; authorization must still be enforced at action boundaries.
- [LangGraph](https://github.com/langchain-ai/langgraph): durable execution, checkpoints, interrupts, and human-in-the-loop; cross-thread memory requires strict namespace authorization.
- [Microsoft AutoGen](https://github.com/microsoft/autogen): termination conditions, max turns, and human feedback; indefinite execution is a failure mode.
- [Google ADK](https://github.com/google/adk-python): graph workflows, task delegation, tool confirmation, sessions, and trajectory evaluation; dynamic nodes still need spawn and side-effect budgets.
- [OpenAI Evals](https://github.com/openai/evals): reusable evaluation registries; metrics can be gamed or overfit, so retain held-out and adversarial cases.
- [DSPy](https://github.com/stanfordnlp/dspy): measured prompt and demonstration optimization without weight changes; guard against benchmark overfitting.
- [Agent Evolution Kit](https://github.com/mahsumaktas/agent-evolution-kit): trust scores, circuit breakers, maker-checker review, budgets, quarantine, and audit trails; full runtime is larger than this starter.
- [OWASP LLM risks](https://genai.owasp.org/llm-top-10/): excessive agency and instruction/data boundary risks must be handled as first-class concerns.

## Recommendations adopted

1. Keep learning project-local and Git-versioned.
2. Require proposal → evidence → reviewer approval → canonical documentation.
3. Use explicit role scope, no default network, no default credentials, and bounded child-agent depth.
4. Keep deterministic CI separate from agent reasoning.
5. Make memory provenance, trust review, and rollback mandatory.
