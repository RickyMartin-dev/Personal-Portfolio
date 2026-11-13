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

- Backend/artifact tests: 31 passed. Offline and mocked-active Playwright suites: 10 passed using Playwright 1.65.0. `npm ci` found zero frontend vulnerabilities. Terraform 1.10.5: both roots format and validate. Workflow and release checks passed for this permission patch; its new PR checks are pending.
- Bootstrap apply created nine account resources; app CI created the ECR repository/image, log groups, monthly DynamoDB table, and Lambda execution role. The first app apply then failed because the GitHub role lacked three narrowly scoped read/tag permissions; no old POC resources were changed. The existing app Terraform state records the partial resources. The API Gateway API and Lambda function were not created.
- All five PR checks passed on both PR #16 commits. The deploy action and Playwright version were updated to the versions already proposed by Dependabot; local browser suites pass on Playwright 1.65.0, and npm reported zero vulnerabilities.
- Updated the existing GitHub deploy-role policy in AWS through a one-resource Terraform plan/apply. The fix adds `iam:ListAttachedRolePolicies` only on the chatbot Lambda role, `dynamodb:DescribeContinuousBackups` only on the monthly counter table, and the API Gateway tags path for the chatbot HTTP API. Track the matching code change in the new follow-up PR.
- Verified the ACTIVE DynamoDB table has the expected string partition key, on-demand billing, and deletion protection; verified the Lambda role trusts only Lambda. Cleared Terraform's temporary taint markers for those already-created resources and replanned: 8 additions, 0 changes, 0 destroys.
- PR #16 merged, but the first deployment run failed during app Terraform apply and skipped health check/Pages publish. Confirmed partial state through Terraform and AWS inventory; next PR will rerun deployment with the corrected permissions.
- After live cutover, refresh dependencies and retire the user-authorized POC cost resources; retain only the new portfolio agent and required deploy controls.
- Open the deployment permission fix PR and wait for all checks. After merge, verify the API and one real response, then retire confirmed POC resources under the owner's existing authorization.
- Finalize verification log, inspect diffs, check archive warning, finish project workflow, and save the task snapshot.
- Owner provided the $5 budget notification email. No other owner input is currently known; report precisely if GitHub/AWS imposes another external approval gate.
