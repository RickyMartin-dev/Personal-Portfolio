# Current task

## Status

The frontend and backend are separated by deployment target, latest shared Project Starter changes are integrated, and the local suite passes. Implementation is committed locally on `develop` as `30a8b11`. No push, live inference, Terraform apply, AWS deployment, or AWS resource change has occurred.

- Owner: Codex
- Upstream Project Starter revision: `d824d3a53c00b1b65cafbdcca0bf7c3c8e1945e7`
- Acceptance: all source is contained in the portfolio monorepo; frontend and backend have independent deployment inputs; backend is FastAPI; local tests and release checks pass; frontend and Lambda packages exclude repo tooling and unrelated source.

## Completed

- Synced Project Starter's Lavish navigation fix: section anchors now pass through the review overlay, with static and generated-page checks.
- Moved static HTML/CSS/JavaScript, the Pages builder, Playwright tests, and Node package tooling into `frontend/`.
- Moved AWS bootstrap and application Terraform, plus the real inference smoke helper, into `backend/` alongside FastAPI/LangGraph and Lambda code.
- Added `frontend/build.py` output at `frontend/dist/`; added a Docker ignore boundary so the Lambda context includes only its Dockerfile, production requirements, and runtime source.
- Updated CI, local setup/dev/test scripts, documentation, Dependabot, Impeccable paths, and root repository map for the new structure.
- Added `./scripts/test.sh` to run Project Starter checks, Python tests, Playwright, and Terraform validation when Terraform is installed.
- `./scripts/test.sh`: release check passed, 19 Python tests passed, and 6 Playwright tests passed. Actual frontend artifact built with 44 files (3,878,625 bytes) and excluded app tooling/backend/infra/test files and unused assets.

## Verification limits

- Terraform format/init/validate skipped locally because Terraform is not installed; both stacks are validated in CI.
- Docker image build skipped because the local Docker daemon is stopped; CI builds the backend image. The Docker context allowlist is covered by a Python regression test.
- No live Bedrock request was made, so the suite incurred no inference or Guardrails usage charges.
- Playwright required host browser process permissions because sandboxed Chromium startup is denied.

## Next safe action

Before the first deployment, finish AWS/GitHub owner setup documented in `docs/deployment-and-costs.md`, review existing AWS chatbot resources and the legacy cutover checklist, then intentionally push `develop` when ready. A push triggers AWS deployment and Pages publication.
