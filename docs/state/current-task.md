# Current task: Low-cost portfolio chatbot V0

## Goal

Activate an inexpensive portfolio assistant with a public website UI, stateless LangGraph backend, AWS request cap/budget alert, deployment automation, and a documented future S3 RAG design.

## Decisions

- UI: compact desktop panel, mobile bottom sheet, and accessible focus behavior.
- Runtime: API Gateway HTTP API → Lambda/FastAPI/LangGraph → Bedrock.
- Privacy: page-memory-only history; no prompt/reply logging; only monthly aggregate request counts in DynamoDB.
- Cost: hard cap of 1,000 valid requests/month, API Gateway throttle, Lambda concurrency 1, $5 account-wide budget alerts, newest ECR image only.
- RAG/S3 indexing is future scope and is not provisioned in V0.

## Completed

- Read-only AWS inventory identified legacy POC costs and dependencies. No old resources have been deleted because the replacement is not live yet.
- Provisioned the $5 monthly budget alerts (email provided by the owner), private versioned Terraform state bucket, and `develop`-only GitHub OIDC role.
- Set GitHub repository variables `AWS_ROLE_ARN` and `TF_STATE_BUCKET`; no long-lived AWS keys were added.
- Implemented endpoint-aware frontend builds and active/offline Playwright suites.
- Implemented an atomic shared request counter, API 429/503 handling, DynamoDB Terraform resources, and scoped IAM permissions.
- Added a GitHub OIDC backend deploy job and endpoint-coupled Pages publish job.
- Added future S3 full-reindex plan and updated product/security/cost docs.
- Created local feature branch `codex/chatbot-v0`; the incomplete Docker Desktop app bundle prevents a local image build, so the existing GitHub Actions runner will build the image after merge.
- Protected `develop`: PR required, exact CI checks required (`starter-and-security`, `security-contract`, `backend`, `frontend`, `terraform`), conversation resolution enabled, force pushes/deletion disabled, and administrators included.
- Opened PR [#16](https://github.com/RickyMartin-dev/Personal-Portfolio/pull/16) from commit `349edf3`.

## Verification and remaining work

- Backend/artifact tests: 31 passed. Offline and mocked-active Playwright suites: 10 passed using Playwright 1.65.0. `npm ci` found zero frontend vulnerabilities. Terraform 1.10.5: both roots format and validate. Workflow and release checks passed; CI will repeat after the dependency/action update.
- Bootstrap apply created nine account resources; application plan reviewed as 14 additions, zero changes, zero destroys. Application root has not yet been applied.
- All five PR checks passed on the first commit. The deploy action and Playwright version were then updated to the versions already proposed by Dependabot; local browser suites pass on the updated version. Push the follow-up commit and wait for fresh required checks before merge.
- After live cutover, refresh dependencies and retire the user-authorized POC cost resources; retain only the new portfolio agent and required deploy controls.
- Wait for PR #16 CI. After merge, verify the API and one real response, then retire confirmed POC resources under the owner's existing authorization.
- Finalize verification log, inspect diffs, check archive warning, finish project workflow, and save the task snapshot.
- Owner provided the $5 budget notification email. No other owner input is currently known; report precisely if GitHub/AWS imposes another external approval gate.
