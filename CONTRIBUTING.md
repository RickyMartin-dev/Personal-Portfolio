# Contributing

Contributions should improve the starter's portability, clarity, or verification quality without turning it into a framework-specific scaffold.

## Before opening a change

1. Read `AGENTS.md`, `docs/architecture.md`, and `docs/security.md`.
2. Explain the problem and the smallest useful change.
3. Keep tool-specific adapters thin and point them to shared sources.
4. Run `./scripts/project check` and review the diff.
5. Update research or decision notes when the change is based on a new external convention.

Avoid committing credentials, machine-specific state, generated transcripts, or assumptions about a user's runtime. Keep Markdown lines readable and link detailed guidance instead of growing the root instruction file.
