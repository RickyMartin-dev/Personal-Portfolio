# Current task: GitHub Pages-only readiness

## Status

The local `develop` worktree now builds and deploys the static Pages site without AWS. The chatbot launcher on Home and About shows a warning icon and an accessible under-construction notice; it sends no API request. Nothing has been pushed, deployed, or changed in AWS.

## Completed

- Replaced the combined AWS + Pages deploy workflow with verification, a static frontend artifact build, and GitHub Pages publication on pushes to `develop`.
- Added a workflow guard that rejects AWS credential setup, Terraform commands, and live inference from the Pages deploy workflow.
- Removed the active browser API/config scripts from Home and About, removed the API Gateway host from their CSP, and excluded the legacy chat client/config from `frontend/dist/`.
- Added a warning launcher and keyboard-accessible under-construction dialog, with Escape/close behavior returning focus to the launcher.
- Simplified local site serving to `./scripts/dev.sh`; it needs only Python 3 and does not start FastAPI or need AWS credentials. Full mocked tests remain available with `./scripts/setup-local.sh` and `./scripts/test.sh`.
- Updated README, agent guidance, architecture, chatbot, local command, and backend/cost docs to distinguish active Pages behavior from dormant backend plans.

## Verification

- `./scripts/test.sh`: PASS — Project Starter/security release checks, 19 Python tests, and 2 Playwright tests against the built Pages artifact. Backend provider calls are mocked. Terraform formatting/validation was skipped locally because Terraform is not installed; CI still validates Terraform on pull requests.
- Built `frontend/dist/`: 43 files, 3,864,886 bytes. Backend, Terraform, legacy chat client/config, API endpoint strings, and starter tooling are absent. Every local HTML `href`/`src` target exists.
- Local `./scripts/dev.sh` smoke check returned the Home HTML over loopback (HTTP 200).
- No AWS call, model inference, GitHub workflow run, push, or deployment occurred.

## Remaining owner actions

- The repository's default branch was `main` and no remote `develop` existed at the last provider check. Configure GitHub Pages to use **GitHub Actions**, then intentionally create/push `develop` when ready; that push will start the Pages workflow.
- `WEB3FORMS_KEY` is optional; without it the site publishes but the contact form will not submit. No AWS variables, AWS CLI session, OIDC role, or Terraform state are needed for current Pages deployment.
- The remote `main` revision still has a legacy Pages workflow. Keep `main` unchanged until the new `develop` Pages path is ready and retire the legacy workflow through the chosen branch process.
- Existing AWS resources were left untouched. Revisit them separately if/when the backend is reactivated or account cleanup is requested.

## Next action

Prepare GitHub Pages settings and the first intentional `develop` push. No workflow run or deployment was initiated here.
