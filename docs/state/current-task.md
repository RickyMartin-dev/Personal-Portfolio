# Current task: security hardening and deployment

## Current checkout

- `develop` is at `678b8c7` after security PR #42 and deployment fixes in PRs #43–#45.

## Completed

- Completed the multi-pass security review and merged the validated hardening in [PR #42](https://github.com/RickyMartin-dev/Personal-Portfolio/pull/42).
- Split the GitHub deployment role into four scoped IAM managed policies to stay within AWS size limits ([PR #43](https://github.com/RickyMartin-dev/Personal-Portfolio/pull/43)).
- Corrected Lambda event-source-mapping tag-read authorization ([PR #44](https://github.com/RickyMartin-dev/Personal-Portfolio/pull/44)).
- Added the table-scoped DynamoDB TTL permission needed by the caller rate-limit table ([PR #45](https://github.com/RickyMartin-dev/Personal-Portfolio/pull/45)).
- Applied the owner-controlled bootstrap policy updates. Preserved table deletion protection; cleared only the Terraform taint left by the interrupted table creation after verifying the table was active.
- Deployment workflow run [#37, attempt 2](https://github.com/RickyMartin-dev/Personal-Portfolio/actions/runs/44033961192) succeeded: preflight, Terraform apply, API health check, and Pages publish.
- Verified the live API health route returns `{"status":"ok"}` and GitHub Pages returns HTTP 200.

## Verification

- Local full suite: 102 Python tests and 10 Playwright tests passed.
- Terraform bootstrap formatting and validation passed.
- PR #42–#45 required checks and merge gates passed before merge.

## Open work

- No deployment or security fix remains open for this task. Continue future chatbot or portfolio work from `develop` and use the required PR gates.
