# Specialist agent library

This directory contains portable, reviewable role cards. It is not a hidden agent runtime and it does not grant tools or credentials.

## Built-in examples

- `roles/ui.md` — interface implementation and visual QA.
- `roles/ux.md` — user flows, accessibility, and usability evidence.
- `roles/python.md` — Python packaging, tests, typing, and performance.
- `roles/trading.md` — research-only trading systems with explicit financial-risk boundaries.

## Create a project-specific role

```bash
./scripts/project specialist data-pipeline "Data pipeline specialist"
```

The command creates `agents/specialists/data-pipeline.md` from the role template. A reviewer must fill in the scope and evidence before a coordinator delegates work to it. The role card can be consumed by Codex, Claude Code, Cursor, or another harness because it is plain Markdown.

## Factory boundary

`prompts/factory.md` defines how an agent may propose a new specialist. The factory may create a role brief, not an unbounded autonomous agent, hidden hook, credential, network service, or global configuration. Runtime-specific spawning is an explicit project adoption decision.
