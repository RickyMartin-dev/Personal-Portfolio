# Contributing

Contributions should improve the portfolio site, chatbot backend, deployment workflow, or maintainability of its embedded Project Starter tools.

## Before opening a change

1. Read `../AGENTS.md`, `architecture.md`, and `security.md`.
2. Explain the problem and the smallest useful change.
3. Keep tool-specific adapters thin and point them to shared sources.
4. From the repository root, run `./scripts/project check` and review `git diff --check`.
5. Update research or decision notes when the change is based on a new external convention.

Avoid committing credentials, machine-specific state, generated transcripts, or assumptions about a user's runtime. Keep Markdown lines readable and link detailed guidance instead of growing the root instruction file.
