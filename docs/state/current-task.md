# Current task: Low-cost portfolio chatbot V0

## Goal

Deploy and verify a low-cost public portfolio assistant, then remove confirmed AWS testing/POC resources under the owner's standing authorization.

## Decisions

- UI: compact panel on desktop and bottom sheet on phones.
- Runtime: API Gateway HTTP API → Lambda/FastAPI/LangGraph → Bedrock.
- Privacy: page-memory-only history; no prompt/reply logging; only aggregate request counts in DynamoDB.
- Cost controls: 1,000 accepted requests per UTC month, API Gateway throttle 0.25 requests/second with burst 1, and $5 account-wide budget alerts to the owner. Alerts notify but do not stop spend.
- V0 uses sanitized Lambda logs and built-in API Gateway metrics. API Gateway access-log delivery is disabled because the deploy role does not receive account-wide CloudWatch Logs delivery permissions.
- S3 full-reindex RAG and future GitHub tools remain planned work, not part of V0.

## Completed

- Implemented and merged PRs #16–#25 through protected develop; required CI checks passed.
- Provisioned the budget, private versioned Terraform state bucket, and develop-only GitHub OIDC deployment role.
- Created the portfolio chatbot ECR repository/image, Lambda execution role/function, DynamoDB monthly counter, and HTTP API.
- Reconciled Terraform state after partial failed applies and corrected deploy-role permissions based on observed provider errors.
- The protected deploy passed backend Terraform apply, /health, and GitHub Pages publish. The live portfolio loads the active /chat endpoint configuration.
- The Bedrock inference profile is active and its ARN/destinations match the configured IAM policy. A live /chat request returns HTTP 503 with AccessDeniedException.
- PR #25 makes allowlisted application events visible in Lambda logs. PR #26 will add the Bedrock operation name to safe log metadata to locate the denied call.

## Verification and remaining work

- Required CI checks passed for PRs #23–#25. The last protected deploy 43649467217 passed image build, Terraform apply, and /health; Pages publication was still running at this checkpoint.
- Merge the operation-specific safe Bedrock diagnostic change, deploy it, and retry one live chat. Fix the identified Bedrock permission or model-access issue; verify a real response before cleanup.
- Refresh AWS resources/dependencies after cutover; remove confirmed testing/POC resources, preserve the new assistant, state, budget, OIDC controls, and resources with unclear ownership or dependents.
- Disable the legacy chatbot deployment workflow after confirming the replacement works. Reinventory once cleanup finishes.
- Update docs/verification-log.md, review git diff and git diff --check, inspect the archive warning, run project finish, and archive a sanitized task snapshot.

## Owner input

- Budget alert recipient is the owner's provided AWS account email.
- No further owner input is currently known; report any service-level approval gate if one appears.
