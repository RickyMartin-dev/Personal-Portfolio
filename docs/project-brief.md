# Project Brief

## Identity

- Project: Ricky Martin's personal portfolio and chatbot.
- Outcome: publish a fast, accessible portfolio and a low-cost, secure Bedrock-backed assistant in one repo.
- Users: recruiters, collaborators, and visitors asking about Ricky's portfolio and current work.
- Current phase: monorepo consolidation and automated deployment from `develop`.

## Scope

### In scope

- Preserve the current static portfolio design and its Web3Forms contact flow.
- Consolidate the FastAPI/LangGraph chatbot and Project Starter tools into this repository.
- Manage the new API Gateway, Lambda, ECR, IAM, state storage, and logging with Terraform.
- Use Amazon Bedrock with the same supported Anthropic Haiku model locally and in production.
- Enforce a best-effort aggregate API Gateway target of 15 messages per minute and Bedrock prompt/content checks.
- Run browser, backend, starter, security, and Terraform checks in CI; deploy site and API from `develop`.
- Track model, token, latency, status, and request ID metrics without persisting message content.

### Deferred

- S3 document upload and automatic RAG indexing.
- Read-only GitHub activity tools.
- Any model-initiated external actions or write access.

### Out of scope

- Rebuilding the portfolio in a UI framework.
- Persisting visitor chat transcripts or server-side conversation memory.
- WAF, VPC/NAT, provisioned concurrency, or always-on compute in v1.

## Success signals

- A clean checkout can run the site and chatbot locally using Bedrock with the production model ID.
- CI checks accessible chat flows, mocked inference, Terraform, secrets, and Project Starter contracts.
- A merge to `develop` deploys the API and frontend, then confirms a real model response.
- No AI credential appears in published frontend files; application logs contain usage metadata only.
- The old endpoint remains until the new endpoint is live and the owner approves specific resources for retirement.

## Constraints and risks

- Bedrock inference and safety checks incur variable per-request charges; the 15/minute API Gateway throttle is best-effort, not a hard monthly spend cap.
- Lambda uses the execution role in production. Local development uses a local AWS profile or an ignored Bedrock API key.
- The replacement uses the active `us.anthropic.claude-haiku-5-5` US inference profile in `us-east-1`; this was confirmed read-only. Keep model/profile support aligned between local `.env` and Terraform.
- A read-only inventory was completed on 2026-11-08. The old chatbot chain and other account resources remain active until the new endpoint is live and cleanup is reviewed.
- The app has public anonymous access. CORS is not authentication; safety depends on bounded requests, server-side checks, throttling, and least privilege.
