# Hardening and upgrade research

Date: 2026-09-23

This report turns current guidance for agentic repositories and GitHub automation into a portable upgrade set. The goal is a starter that helps agents improve a project over time without turning generated notes, third-party actions, or remote content into implicit authority.

The five independent Luna research reports are preserved alongside this synthesis: CI security, agent boundaries, portability, project-local learning, and adversarial acceptance.

## Research signals

- GitHub recommends least-privilege workflow permissions, auditing third-party actions, and pinning actions to full-length commit SHAs: [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use).
- GitHub documents dependency updates for GitHub Actions through Dependabot: [Automatic updates for GitHub Actions](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions).
- GitHub recommends secret scanning and push protection to reduce accidental credential exposure: [Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection).
- OWASP identifies excessive agency and instruction-related risks as core risks for LLM applications: [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/).
- OpenAI's current guidance emphasizes a short repository map and periodically revisiting instructions and skills: [Rethinking skills and prompts](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra).
- Claude Code supports committed project instructions, rules, commands, skills, and memory surfaces: [Claude Code directory](https://code.claude.com/docs/fr/claude-directory).
- Community starter patterns reinforce shared memory, validators, and plan → execute → verify → reflect loops: [Agentic project template](https://github.com/rumotion/ai-agent-project-template), [AgentsMD Kit](https://github.com/TateZhouSiu/agents-md-kit).

## Ten upgrades implemented

1. **Security disclosure policy.** Added `SECURITY.md` with supported-version, reporting, rotation, and adoption guidance.
2. **Local secret and sensitive-file scanning.** Added `scripts/check-secrets.sh` and wired it into the release check so obvious credential material fails before commit.
3. **Workflow supply-chain audit.** Added `scripts/check-workflows.sh` to require pinned action SHAs, read-only contents permissions, safe checkout credentials, and no unsafe trigger patterns.
4. **Dedicated security CI.** Added `.github/workflows/security.yml` with pinned checkout, least-privilege permissions, concurrency limits, and a short timeout.
5. **Automated action update discovery.** Added `.github/dependabot.yml` for weekly GitHub Actions update proposals.
6. **Instruction-surface integrity checks.** Added `scripts/check-instruction-surfaces.sh` to keep native adapters thin, linked to `AGENTS.md`, and free of high-risk command patterns.
7. **Prompt-injection boundary fixture.** Added `.agentic/fixtures/untrusted-repo-note.md` and a boundary check that proves adversarial repository text is treated as data, not policy.
8. **Portable manifest and upgrade contract.** Added `.agentic/manifest.json` plus `scripts/check-manifest.sh` so adapters, source of truth, state, and upgrade policy are machine-checkable.
9. **Structured cross-session memory bank.** Added `docs/state/` with current task, handoff, next task, risks, bugs, proposals, and archive guidance. This is how agents improve from project-specific evidence rather than hidden training.
10. **Agent-approved learning and evidence-oriented release gate.** Added the promotion template and reviewer protocol, `./scripts/project release-check`, `doctor --json`, negative-path fixtures, a handoff template, and verification guidance so every improvement has reproducible evidence.

## Design decision

The starter keeps learning repository-local and reviewable. Agents can propose state, lessons, experiments, and research; a designated reviewer agent may promote only evidence-backed knowledge into shared policy. No automatic model fine-tuning, remote memory service, credentials, hooks, auto-commits, or network calls are introduced by this upgrade.
