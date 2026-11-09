# Luna research: cross-tool portability

Role: read-only Luna xhigh specialist

## Findings

- Codex, Claude Code, and Cursor can share a repository contract when `AGENTS.md` and `docs/` are canonical and native files remain thin adapters.
- Adapter parity should be validated mechanically so adding a canonical workflow cannot silently omit a Claude or Cursor command.
- A reusable starter should not require a project language, package manager, hosted service, MCP server, or Python/Node runtime for its own checks.
- An onboarding doctor is more useful than a second copy of the contract check when it reports detected adapters and remaining project placeholders.

## Implemented decision

The starter keeps checks on Bash and Git/core shell tools, verifies canonical prompt references in both adapter families, and gives `doctor --json` stable onboarding data with adapter and placeholder fields.

## Sources

- [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model)
- [OpenAI skills and prompts guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)
- [Claude Code project directory](https://code.claude.com/docs/fr/claude-directory)
- [Gemini CLI context files](https://geminicli.com/docs/cli/gemini-md/)
- [GitHub Copilot customization](https://docs.github.com/en/copilot/reference/customization-cheat-sheet)
