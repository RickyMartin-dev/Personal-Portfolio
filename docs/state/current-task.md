# Current task: Low-cost portfolio chatbot V0

## Goal

Deploy and verify a low-cost public portfolio assistant, then remove confirmed AWS testing/POC resources under the owner's standing authorization.

## Decisions

- UI: compact panel on desktop and bottom sheet on phones.
- Runtime: API Gateway HTTP API → Lambda/FastAPI/LangGraph → Bedrock.
- Privacy: page-memory-only history; no prompt/reply logging; only aggregate request counts in DynamoDB.
- Cost controls: 1,000 accepted requests per UTC month, API Gateway throttle 0.25 requests/second with burst 1, and $5 account-wide budget alerts to the owner. Alerts notify but do not stop spend.
- V0 uses sanitized Lambda logs and built-in API Gateway metrics. API Gateway access-log delivery is disabled because the deployment role does not receive account-wide CloudWatch Logs delivery permissions.
- S3 full-reindex RAG and future GitHub tools remain planned work, not part of V0.

## Completed

- Implemented and merged PRs #16–#23 through protected `develop`; required CI checks pass.
- Provisioned the budget, private versioned Terraform state bucket, and `develop`-only GitHub OIDC deployment role.
- Created the portfolio chatbot ECR repository/image, Lambda execution role/function, DynamoDB monthly counter, and HTTP API.
- Reconciled Terraform state after partial failed applies and corrected narrowly scoped deploy-role permissions based on provider errors.
- PR #23 adds API Gateway stage tag permissions. Reviewed/apply result: 0 resources added, 1 IAM policy updated, 0 destroyed.
- Deploy run `43647030636` passed verification and image publishing but failed enabling API Gateway access-log delivery. Automatic review rejected adding account-wide CloudWatch delivery/resource-policy permissions to the GitHub role.
- Updating Terraform and docs to remove API Gateway access logs and their unused log group; Lambda logs and API Gateway metrics remain.

## Verification and remaining work

- PR checks: backend, frontend, starter-and-security, security-contract, and terraform passed on PR #23.
- Terraform bootstrap validation and the inspected stage-tag policy plan passed; the policy-only update applied successfully.
- Open a PR for the access-log delivery removal, wait for checks, and merge. Follow the next deploy; verify live `/health`, one real `/chat` response, GitHub Pages publish, Lambda logs, and API Gateway metrics.
- Refresh AWS inventory and dependencies after cutover; remove confirmed testing/POC resources, preserve the new assistant, state, budget, OIDC controls, and resources with unclear ownership or dependents.
- Disable the legacy chatbot deployment workflow after confirming the replacement works. Reinventory once cleanup finishes.
- Update `docs/verification-log.md`, review `git diff` and `git diff --check`, inspect the archive warning, run project finish, and archive a sanitized task snapshot.

## Owner input

- Budget alert recipient is the owner's provided AWS account email.
- No further owner input is currently known; report any service-level approval gate if one appears.
