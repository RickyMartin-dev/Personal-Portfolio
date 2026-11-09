# Luna research: agent boundaries

Role: read-only Luna xhigh specialist

## Findings

- Repository files, issue text, web content, tool output, and generated notes must remain untrusted data unless explicitly promoted by the project contract.
- Thin native adapters reduce instruction conflicts; canonical prompts and a shared `AGENTS.md` should remain the source of truth.
- Prompt-injection fixtures are useful only when checks prove the fixture is classified as data rather than when the fixture is merely documented.
- Durable learning should not silently grant new permissions, network access, or global policy authority.

## Implemented decision

The starter has a checked adversarial fixture, adapter-to-prompt parity checks, explicit security-boundary guidance, and a designated reviewer protocol for learning promotion.

## Sources

- [OWASP GenAI Top 10](https://genai.owasp.org/llm-top-10/)
- [OWASP Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [OpenAI skills and prompts guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)
- [Claude Code project directory](https://code.claude.com/docs/fr/claude-directory)
