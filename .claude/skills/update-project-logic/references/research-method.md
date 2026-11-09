# Research method and evidence standard

Use this reference on each invocation of `update-project-logic`.

## Scope the scan

- Start from the project's actual stack, agents, skill formats, hook/config surfaces, current research, and last checked date.
- When provider CLIs are available, record their exact versions and release channels. Compare them with official stable releases and supported versions; treat prereleases and unidentified local builds separately. Review version-sensitive security, sandbox, hook, compaction, and skill-discovery changes. For Claude Code, verify whether the active version discovers project skills from this checkout or linked worktree.
- Search for meaningful changes since the last relevant report, then verify current behavior in official documentation or release notes. Also check current official guidance when a feature is already in use, even if no new announcement appears.
- Focus on AI-assisted software development: coding-agent behavior and releases, skill/instruction formats, harnesses and feedback loops, evaluations, memory/context, security, and project-specific AI frameworks or APIs.
- Prefer project-relevant changes over an exhaustive news roundup. A feature being new or popular does not make it a fit.

## Source order

1. Official product documentation, changelogs, migration guides, and security guidance from the tool or framework owner.
2. The applicable open standard, specification, or primary research paper.
3. Maintainer-authored engineering reports with a concrete implementation and evidence.
4. Other reporting only to discover a claim; verify the claim in a primary source before recommending action.

Record the source title, direct URL, date checked, publication/update date when available, claim supported, applicable product/version, limitation, and adoption decision. Open the source itself; search snippets are discovery leads only. Cross-check potentially breaking or security-sensitive claims against a second primary source or the implementation.

## Adoption test

For each relevant change, answer:

- Does this solve an observed project problem or support an accepted goal?
- Does the project use a compatible version and execution surface?
- What is the maintenance, security, privacy, migration, or context cost?
- Can it be trialed and verified reversibly?

For a global CLI update, report the gap and relevant risk; do not install or change the user's tool configuration during this project-local review.

Label the outcome **Adopt**, **Defer**, or **Reject**, with one concise reason. If no credible source or local evidence supports the fit, defer it. Never silently introduce a dependency, permission, network capability, production action, or global configuration.

## Durable record and output

- Create or update a dated report under `docs/research/` when the scan finds material new evidence or changes a previous recommendation. Reuse the project's research template and link it from the research index if one exists. Avoid duplicate reports for an unchanged same-day scan.
- Put accepted project facts in their canonical docs and cite the research report where useful. Keep version-sensitive product guidance dated; do not copy a stale “latest” value into evergreen instructions.
- If no material upstream change is relevant, record that result briefly in the invocation summary instead of manufacturing an upgrade.
- Return only the highest-value findings. Each improvement should name the evidence, impact, recommended fix, and whether it needs a decision. Mark an unverified concern as a hypothesis.

## Improve the workflow from real use

When a run misses an intended trigger, skips a required check, makes an unsupported update, or gets corrected by the user, preserve the smallest sanitized reproduction in an existing evaluation set if one is available. After changing the skill, check a realistic positive case and a nearby negative case. Keep evaluation criteria small and observable: invocation, expected artifacts, evidence links, approval boundaries, and concise output. Do not infer a universal rule from one incident or add an expensive model-evaluation framework before repeated failures justify it.
