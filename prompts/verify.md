# Verify prompt

Read `AGENTS.md`, `docs/project-commands.md`, and `docs/quality.md`.

Verify the acceptance criteria with the exact documented commands. Inspect the diff and test important failure paths. Separate facts from inference. If a check cannot run, record the reason and the best available evidence; do not replace a missing check with a confidence statement.

Return a compact evidence table:

| Check | Command or inspection | Result | Notes |
| --- | --- | --- | --- |

When evidence should survive the session, append a concise row to `docs/verification-log.md` with the date, related task, result, and a link or command that another person can reproduce.
