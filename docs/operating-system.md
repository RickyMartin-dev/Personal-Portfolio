# Project operating system

This starter is a repository-local operating system for long-lived agentic work. It is intentionally language- and domain-agnostic: the project supplies its runtime commands, while this repository supplies the memory, research, upgrade, specialist, and verification contracts.

The normal user experience is automatic. Agents run `./scripts/project start --task "<request>"` before substantive work and `./scripts/project finish --summary "<outcome>"` after verification. The commands refresh local orientation, install hooks, capture durable context, and update the handoff without asking the user to perform routine project management.

## The loop

```text
orient → plan → implement → verify → review → compact → learn → research → upgrade
                         ↘ specialist brief ↗              ↘ promote ↗
```

Every loop produces inspectable artifacts. Chat is a temporary interface; Git and `docs/` are the durable system of record.

## Second brain

The second brain is a lazy-loaded graph of project facts, not a hidden vector database:

- `docs/project-brief.md` — identity, users, constraints, and unknowns.
- `docs/architecture.md` — boundaries, modules, data flows, and threat model.
- `docs/project-commands.md` — the project's real commands and expected output.
- `docs/state/` — current task, handoff, risks, bugs, and proposals.
- `docs/decisions/` — durable choices and rejected alternatives.
- `docs/experiments/` — measurable trials and keep/discard evidence.
- `docs/research/` — external comparisons, source register, and freshness dates.
- `docs/upgrades/` — prioritized improvements and their acceptance evidence.
- `docs/compactions/` — point-in-time snapshots that make context recoverable after compaction.
- `agents/` — reviewed specialist role cards, not executable hidden agents.

`AGENTS.md` stays a short map. Agents should load only the nodes relevant to the task, then record new edges in the appropriate document.

## Compaction protocol

Before a long session ends, a context window compacts, or work is handed off:

1. Run `./scripts/project compact <slug>`.
2. Fill the generated snapshot's decisions, evidence, unfinished work, and next actions.
3. Update `docs/state/handoff.md` with the smallest resume path.
4. Link the snapshot from the task plan or verification log.

The command records repository facts automatically (branch, recent commits, file inventory, docs map, state files, and verification entry points) while keeping secrets and local credentials out of the snapshot. It does not replace human or agent judgment about why a decision was made.

## Research and upgrades

Use `./scripts/project research <slug> "<question>"` for an evidence-backed comparison. Record source URL, date checked, pattern, limitation, and adoption decision. Use `./scripts/project upgrade <slug> "<title>"` for a bounded improvement proposal. Run `./scripts/project suggest-upgrades` to turn repository signals into a prioritized next-action list.

Upgrade proposals require scope, expected benefit, evidence commands, rollback, and a trust review. A reviewer agent may promote a proposal only after the evidence passes; no proposal may silently change global agent configuration, permissions, network access, or credentials.

## Specialist agents

`agents/` is a portable role library. `./scripts/project specialist <slug> "<role>"` creates a reviewed role brief for a UI, UX, Python, trading, data, security, or domain-specific specialist. The brief declares inputs, outputs, evidence, and authority boundaries. A coordinator may delegate the brief to a supported agent harness, but the repository never silently installs tools, grants credentials, or spawns an unbounded agent fleet.

## Presentation

The current system is summarized in `.lavish/project-starter-operating-system.html`. Open it with `npx -y lavish-axi .lavish/project-starter-operating-system.html` for a visual review surface. Keep the artifact illustrative and point back to repository files for authoritative details.

## What “learning” means here

Learning is project-local improvement from verified evidence: a failed test becomes a bug or lesson, a measured experiment becomes a decision, and a successful proposal becomes promoted policy. This starter does not fine-tune models, transmit memory to another repository, or claim that an agent can safely rewrite itself without review.
