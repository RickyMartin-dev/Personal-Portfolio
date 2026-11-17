# Current task: security hardening and deployment

## Current checkout

- Started from `develop` at `3870c7f` and created `feature/security_update` as requested.
- The remote `feature/security_update` already belongs to merged PR #32. Preserve that history; publish this follow-up from a fresh branch.
- A full multi-pass review completed. Findings were validated against this checkout because the archived scanner report recorded a source-revision mismatch.

## Implemented

- Expanded secret scanning to project guidance, local state, and reference files; reject symlinks and unsafe active Codex hooks.
- Made local Git hooks opt-in and isolated/sanitized project snapshots.
- Isolated conditional Impeccable component previews in a sandboxed iframe with restrictive CSP.
- Added a per-source chatbot rate limit before request validation and included rejected requests in the monthly quota.
- Added an IAM permissions boundary to application roles and narrowed deploy-role permissions for roles, API Gateway, and Lambda event mappings.
- Updated backend, infrastructure, governance, and security tests/docs.

## Verification

- `./scripts/test.sh`: repository checks and 90 Python tests passed; Chromium could not launch in the default sandbox.
- Unsandboxed `npm run test:e2e` from `frontend/`: all 10 Playwright tests passed.
- `git diff --check` passed. Terraform CLI is unavailable locally; pull-request CI must validate both Terraform roots.
- No AWS resources or GitHub settings have been changed by this audit.

## Remaining work

1. Commit and push the security changes on a fresh follow-up branch; open a PR to `develop`.
2. Resolve review findings and wait for every required check to pass.
3. Merge under branch protections, approve the AWS deployment gate as authorized, and verify the deployment health checks.
4. Save the sanitized task archive and update the handoff.
