# Decision: Adopt Impeccable as the starter's design skill

- Date: 2026-11-08
- Status: accepted
- Owner: Repository owner (requested); Claude Code (implemented)

## Context

The owner asked to install [Impeccable](https://github.com/pbakaus/impeccable) and use it for all design work, starting with a cleaner, Apple-grade restyle of the Lavish reports. The starter supports Codex, Claude Code, and Cursor, so a design skill must reach all three. Impeccable ships a skill, review subagents, and a design hook that runs a detector binary after UI edits; the launcher downloads that binary on first run.

## Options considered

1. Install for Claude Code only, globally. Least repository change, but Codex and Cursor users get nothing and adopters cannot see the design contract.
2. Install project-scoped for all three providers, commit skills, agents, and hook manifests, ignore the platform binaries. Every agent gets the same design workflow; the hook adds a network download on first use.
3. Vendor as a Git submodule and link skills. Pinned and reviewable, but links install no hooks and add submodule friction for every adopter.

## Decision

Option 2. Skills live in `.claude/skills/impeccable/`, `.agents/skills/impeccable/`, and `.cursor/skills/impeccable/`; subagents in `.claude/agents/` and `.cursor/agents/`; hooks in `.claude/settings.json`, `.cursor/hooks.json`, and `.codex/hooks.json`. Engine binaries under `*/skills/impeccable/scripts/bin/` stay gitignored and excluded from the secret scan (compiled bytes match credential patterns by chance). `PRODUCT.md` and `DESIGN.md` hold the product and visual context the skill reads. `scripts/check-design.sh` enforces the layout.

## Consequences

- Positive: one design workflow across agents; the hook catches common UI defects as files are edited; `DESIGN.md` makes the visual system durable.
- Cost or risk: hooks run outside model approval and the first run downloads a third-party binary. Hook commands are guarded (`[ -f launcher ] ||`) and time-bounded (5s edit, 30s stop). Codex users must approve the project hook in `/hooks`. Disable with `--settings '{"disableAllHooks": true}'` or `/impeccable hooks off`.
- Follow-up: refresh with `npx impeccable update` during `/update-project-logic` reviews; projects created from the starter should rerun `/impeccable init` and rewrite `PRODUCT.md`.
