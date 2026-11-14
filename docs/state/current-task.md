# Current task: Low-cost portfolio chatbot V0

## Goal

Deploy and verify a low-cost public portfolio assistant, then retire confirmed AWS testing and POC resources under the owner's standing authorization.

## Deployed behavior

- The public site opens a compact assistant panel on desktop and a bottom sheet on phones.
- The runtime is API Gateway HTTP API → Lambda/FastAPI/LangGraph → Amazon Nova Micro on Bedrock.
- Chat history stays in page memory and is discarded when the page closes. The backend stores only a monthly request count and logs allowlisted operational metadata, never prompts or replies.
- Cost controls include 1,000 accepted requests per UTC month, API Gateway throttling at 0.25 requests/second with burst 1, and $5 account-wide budget alerts. Budget alerts notify; they do not stop spending.
- S3 document ingestion, automatic reindexing, persistent history, and a separate Pydantic agent flow are future work. V0 has no RAG index or monitored document bucket.

## Completed

- PRs #16–#27 passed their required checks and were merged to protected `develop`; deployment run [43651315456](https://github.com/RickyMartin-dev/Personal-Portfolio/actions/runs/43651315456) passed backend apply, `/health`, and Pages publication.
- The live `/chat` endpoint returned HTTP 200 with a nonempty response from the published-site origin. The active model is `us.amazon.nova-micro-v1:0`; response content was not retained.
- Provisioned the $5 account-wide budget, private versioned Terraform state bucket, and `develop`-restricted GitHub OIDC deploy role.
- Disabled the old `Website_AI_Chatbot` GitHub deployment workflow and removed its repository secrets.
- Removed the old APIs, disconnected chatbot Lambdas, Titanic endpoints/configs/models, notebook, POC SageMaker domains/EFS, POC CloudFormation/CDK stacks, old ECR repositories/images, POC S3 buckets and versions, old logs, Glue metadata, alarms, and old DynamoDB test table.
- Post-cleanup inventory found one portfolio API, Lambda, ECR image, request-quota table, and sanitized Lambda log group; the only S3 bucket is the Terraform state bucket. No SageMaker domains/endpoints, EFS filesystems, or POC CloudFormation stacks remain.

## Verification

- Final health check passed with TLS verification; a bounded `/chat` request from the published-site origin returned HTTP 200 and a 49-character response. Only status and response length were retained.
- The $5 budget notification rules are configured to the owner-supplied email at 80% and 100% actual spend and 100% forecast spend.
- November Cost Explorer data still includes charges accrued before the November 14 cleanup. Compare the next complete billing cycle for the ongoing baseline.
- The current active CLI and console identities were preserved. An automatic approval review blocked the optional bulk removal of POC IAM users/roles/keys because of account-access risk; no IAM changes were applied.

## Owner input

- No additional setup is required to run V0.
- If the owner wants the remaining dormant POC IAM identities and roles removed, provide explicit approval for that account-access change. It does not block the chatbot.
- When RAG work begins, provide or select the portfolio documents to seed the monitored S3 prefix.
