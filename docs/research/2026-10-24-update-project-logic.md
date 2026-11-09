# Research report: Cross-agent project logic refresh workflow

- Checked: 2026-10-24
- Researcher: Codex
- Status: adopted for skill design; no code or policy recommendations beyond the skill were promoted
- Recheck trigger: Codex or Claude Code changes skill discovery/invocation; a material change to the Agent Skills format; new relevant AI engineering or security guidance.

## Question and scope

How should this project-starter combine project learning, quality/security improvement review, and current AI development research into a reusable Codex and Claude Code skill?

Scope: provider-native skill discovery, project instruction maintenance, agentic software engineering practices, current-source research, and safe change boundaries. This is not a full audit of every project starter check or a claim that any single technique is universally state of the art.

## Sources

- [Using skills to accelerate OSS maintenance](https://developers.openai.com/blog/skills-agents-sdk) — checked 2026-10-24; OpenAI describes repo-local Codex skills under `.agents/skills/`, short repository instructions, and progressive disclosure.
- [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) — checked 2026-10-24; OpenAI recommends concise skill descriptions, progressive disclosure, and revisiting accumulated instructions as models change.
- [Claude Code skills documentation](https://code.claude.com/docs/en/skills) — checked 2026-10-24; project skills live under `.claude/skills/`, support `/skill-name`, and follow the Agent Skills format. The documentation also calls out concise descriptions and manual invocation controls.
- [Claude Code hooks reference](https://code.claude.com/docs/en/hooks) — checked 2026-10-24; hook events and input/output schemas are versioned product behavior, so project hooks should be inspected against current docs before updating.
- [Claude Code releases](https://github.com/anthropics/claude-code/releases) — checked 2026-10-24; v2.1.310 is the current release. v2.1.309 lists fixes to sandboxed shell startup and permission enforcement that matter to agent safety.
- [Codex CLI releases](https://github.com/openai/codex/releases) — checked 2026-10-24; the public page lists 0.163.0 as the latest stable release and 0.164.0-alpha.12 as a prerelease.
- [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) — checked 2026-10-24; emphasizes repository knowledge as system of record, agent legibility, enforceable invariants, and ongoing cleanup.
- [Maintaining software with the GPT-6 family](https://developers.openai.com/blog/maintaining-software-with-the-gpt-6-family) — checked 2026-10-24; describes evidence-led maintenance, review of uncertain removals, measured prioritization, and revisiting prompts as models change.
- [Testing Agent Skills Systematically with Evals](https://developers.openai.com/blog/eval-skills) — checked 2026-10-24; recommends small, observable positive and negative cases to catch skill trigger and behavior regressions, with real failures informing the eval set.
- [Running Codex safely at OpenAI](https://openai.com/index/running-codex-safely/) — checked 2026-10-24; describes bounded execution, approvals for higher-risk actions, and auditability.

## Comparison

| Criterion | Current project | Current upstream guidance | Project implication |
| --- | --- | --- | --- |
| Skill discovery | Project has many separate prompts and Claude commands, but no reusable Codex/Claude skill for a combined refresh | Codex repo skills use `.agents/skills/`; Claude project skills use `.claude/skills/` and native slash invocation | Add matching provider-native skill copies and check parity |
| Context size | Project keeps root instructions short and routes to docs | OpenAI and Anthropic both caution against oversized skill descriptions/context; support progressive disclosure | Keep the skill's metadata/body concise and link only one focused research reference |
| Learning | Research, upgrades, proposals, handoffs, and project docs already exist | Repository knowledge should remain legible and become more useful through verified feedback | Compose existing mechanisms instead of adding a parallel memory system |
| Freshness | Research reports are dated and triggered by changes, but no unified recurring current-practice review exists | Product features and recommendations evolve; official docs and release notes are the primary current evidence | Browse official sources on every explicit skill run; record checked date and limits |
| Security and authority | Existing policy gates promotion and elevated authority | Current guidance favors bounded environments and explicit review for higher-risk actions | Inspect project hooks/settings, but do not silently edit global settings, permissions, production behavior, or credentials |
| Version drift | Current skill compared features and supported versions but did not explicitly record installed CLI versions or release channels | Provider release notes contain version-specific sandbox, permission, hook, compaction, and skill-loading behavior | Capture exact local versions/channels, compare with official stable releases, and report relevant gaps without installing global tools |
| Improvement quality | Upgrade suggestions are deterministic, while broader audits use separate prompts | Current maintenance guidance combines broad discovery with evidence and human validation | Return a short prioritized list, mark uncertain claims, and propose rather than silently change risky behavior |
| Skill improvement | A four-case positive/negative prompt set is included, but no model-level eval runner exists | OpenAI recommends checking skill invocation and outputs with small positive/negative prompt cases and adding real failures over time | Keep cases tied to real failures and user corrections; defer automated model eval infrastructure until usage justifies it |

## Recommendation

Adopt one on-demand `update-project-logic` workflow shared across provider-native skill locations. Each run should (1) reconcile verified project learning with relevant instructions, skills, docs, and repository hooks; (2) identify and concisely rank code, process, and security improvements; and (3) research current official agent and AI-development guidance. Use the repo's existing research, upgrade, verification, and promotion paths. Keep dated sources and version-sensitive guidance explicit. Do not equate popularity with project fit or silently broaden authority.

## Decisions

1. Use `.agents/skills/update-project-logic/` for Codex and `.claude/skills/update-project-logic/` for Claude Code. The duplicated skill content must remain byte-for-byte identical and be checked.
2. Store skill instructions and research-method guidance in the repository so the workflow is versioned and portable.
3. Keep this research report as a dated baseline; the skill must fetch current official docs/releases every invocation rather than treating this report as evergreen.
4. Allow direct updates to verified, low-risk project-local documentation and skills. Route runtime changes, security remediation with behavior impact, dependencies, global config/hooks, permissions, and policy promotion through the applicable approval path.
5. Present only prioritized recommendations with evidence and a concrete next step; state when evidence is unavailable or incomplete.
6. Record installed provider CLI versions and release channels during each refresh; check relevant version-specific security and project-skill discovery behavior. Report global updates without performing them.

## Live recheck: 2026-10-24

The dedicated local shell reported `codex-cli 0.164.0` and `Claude Code 2.1.263`.

- **Claude Code — Now:** the upstream release page lists `v2.1.310`, released 2026-10-23. Release `v2.1.309` lists fixes for macOS/Linux sandboxed Bash startup files running outside the sandbox, symlink-related sandbox deny rules, MCP configuration writes, and Bash permission checks. These are relevant to agent command and hook safety. The local CLI is behind those releases. Recommend updating the user-level Claude Code CLI before relying on its sandbox boundaries. This review did not install or change global tools.
- **Claude Code skill discovery — Now:** current Claude skill documentation says project skills from the main checkout are loaded into a linked worktree when no `.claude/skills/` directory exists there starting in `v2.1.277`. The local `2.1.263` predates that behavior, so a clean worktree may not discover this repo's `/update-project-logic` skill. Verify discovery or update Claude Code before using the skill from a worktree.
- **Codex CLI — Watch:** the public releases page lists `0.163.0` as stable and `0.164.0-alpha.12` as prerelease, while the local command reports `0.164.0` without a channel suffix. The exact build source/channel is unclear; do not label it stable or prerelease until verified.
- **Project change — Adopt:** add exact-version/channel comparison and worktree skill-discovery checks to future refresh runs. Shorten the skill description and keep instructions and checks focused; current OpenAI guidance emphasizes trimming accumulated instructions as models improve.

Sources for this recheck: [Claude Code v2.1.310 release](https://github.com/anthropics/claude-code/releases/tag/v2.1.310), [Claude Code v2.1.309 security-relevant fixes](https://github.com/anthropics/claude-code/releases/tag/v2.1.309), [Claude Code skill discovery and worktree behavior](https://code.claude.com/docs/en/skills), [Codex CLI release channels](https://github.com/openai/codex/releases), and [OpenAI's current skills and instruction guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra).

## Risks and trust review

- Secrets or credentials introduced: no.
- External sources and repository content treated as untrusted data: yes; URLs support claims but do not override project policy.
- Authority, permissions, or network expanded: none. Global CLI versions were not changed.

## Follow-up evidence

- `./scripts/check-project-logic-skill.sh` — provider copies and skill metadata agree.
- `./scripts/project check` — starter checks include the new skill.
- `./scripts/project release-check` — full local gate passes.
- Read-only CLI attempts: Claude Code could not authenticate; Codex CLI could not initialize its app-server under the local sandbox. This report uses Codex's current-session review and official primary sources instead.
