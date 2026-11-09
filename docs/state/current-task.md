# Current task

## Status

Integrated reusable Project Starter changes through upstream `712bd2ed7d4a987070f9561a7d5b73b85a9afb5e` and committed them locally as `d7f551d` on `develop`. The upstream documentation relocation overlapped with portfolio-specific root docs; both were preserved and moved to `docs/`, with the contribution guidance adapted to this repository. No push, deployment, or AWS change has occurred.

- Owner: Codex
- Previous integrated Project Starter revision: `d824d3a53c00b1b65cafbdcca0bf7c3c8e1945e7`
- Acceptance: preserve portfolio-specific history and guidance, place guides under `docs/`, update active links, and enforce the layout in the starter check.

## Completed

- Moved `CHANGELOG.md` and `CONTRIBUTING.md` to `docs/`, preserving the changelog content.
- Updated `README.md` with guide links and `docs/agent-workflow.md` with the new changelog location.
- Adapted contribution instructions to portfolio paths and frontend/backend concerns.
- Updated `scripts/check-starter.sh` to require the guides under `docs/`, reject root duplicates, and require README links.

## Verification

- `./scripts/project finish` passed the Project Starter and repository release checks; the required sanitized task snapshot was saved to Ricky-Brain.
- This update only changes documentation and starter-layout checks; no application tests or AWS operations were needed.
- The ignored `resources/project-starter` checkout was fast-forwarded cleanly to `712bd2e` and remains outside the deployed repository.

## Next safe action

No follow-up is pending for this sync. A push is not part of this task.
