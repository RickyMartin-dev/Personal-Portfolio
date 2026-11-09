# Plan: Create a cross-agent self-learning project maintenance skill

- Owner: Codex
- Created: 2026-10-24
- Status: complete
- Scope: Add an on-demand skill for Codex and Claude Code that refreshes project knowledge, reviews improvements and risks, and researches current AI development practice.

## Goal

Make `/update-project-logic` available to Claude Code and `$update-project-logic` available to Codex, with a shared evidence-based workflow and concise output.

## Non-goals

- Automatically changing application behavior, dependencies, production systems, global settings, or permissions.
- Claiming model training or unattended self-modification.
- Hard-coding today's versions or trends as permanent best practice.

## Assumptions and decisions needed

- Codex discovers repository skills from `.agents/skills/`; Claude Code project skills under `.claude/skills/` create slash-invocable commands.
- Duplicate provider copies are checked for exact parity; current research is saved as a dated report in `docs/research/`.
- The skill refreshes project-local guidance when evidence is clear, and presents unresolved implementation/security improvements for review.

## Steps

- [x] Research current official Codex and Claude Code skill formats, hooks, and AI engineering guidance.
- [x] Write a dated research report with source links, adoption decisions, and freshness limits.
- [x] Create the shared skill, research reference, and positive/negative prompt cases in both provider-native locations.
- [x] Integrate the command into project guidance, README, research/upgrade docs, and manifest.
- [x] Add parity and metadata checks to the starter verification suite.
- [x] Validate skill files, run project checks, and review the final diff.

## Acceptance criteria

- [x] Claude Code exposes `/update-project-logic`; Codex discovers `$update-project-logic` from `.agents/skills/`.
- [x] The workflow updates verified project facts and relevant guidance, audits code/process/security improvements, and researches current official practices on each run.
- [x] Reports are concise, prioritized, evidence-linked, and distinguish findings from hypotheses.
- [x] Risky code changes, external/global configuration, permissions, production actions, and policy promotion remain gated.
- [x] Provider skill copies stay identical and checks pass.

## Verification

```bash
./scripts/check-project-logic-skill.sh
claude plugin validate .claude/skills
./scripts/project check
./scripts/project release-check
git diff --check
```

Codex's bundled `quick_validate.py` could not run because PyYAML is not installed. The frontmatter was manually checked; Claude Code's skill validator passed on the identical copies.

## Risks and recovery

- Provider skill directories duplicate files; enforce parity in the starter check and update both from one reviewed patch.
- Fast-changing AI guidance can become stale; cite source dates, re-check official docs on each invocation, and label scope/limitations.
- Broad audits can create noisy changes; limit automatic edits to factual, project-local guidance and keep code/policy changes reviewable.
