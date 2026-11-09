# Luna research: project-local learning

Role: read-only Luna xhigh specialist

## Findings

- The useful unit of learning is a project-specific, reviewable artifact: current task, handoff, risk, bug, experiment, lesson, or decision.
- Agents should be able to propose improvements without allowing unreviewed output to rewrite shared policy.
- A promotion protocol should require evidence, scope, expected benefit, rollback, secret review, and trust-boundary review.
- Cross-repository memory and automatic model retraining add privacy, credential, and poisoning risks that do not belong in a universal starter.

## Implemented decision

Each adopted project gets its own `docs/state/` memory bank and proposal area. A designated reviewer agent may approve the smallest evidence-backed promotion and must record verification evidence.

## Sources

- [OWASP GenAI Top 10](https://genai.owasp.org/llm-top-10/)
- [OWASP Agentic AI mapping](https://genai.owasp.org/download/52117/)
- [OpenAI Agents guidance](https://developers.openai.com/api/docs/guides/agents)
- [Agentic project template](https://github.com/rumotion/ai-agent-project-template)
- [AgentsMD Kit](https://github.com/TateZhouSiu/agents-md-kit)
