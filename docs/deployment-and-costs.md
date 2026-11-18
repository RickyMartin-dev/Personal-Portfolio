# Chatbot deployment and operating costs

## Delivery

Feature branches target `develop` and run the required quality checks before merge. The production workflow compares against the last successful release, then deploys only changed application layers. Backend runtime and application Terraform changes use short-lived GitHub OIDC credentials and the protected `aws-production` environment; frontend-only and docs/tests-only releases do not use AWS credentials. Mixed frontend/backend changes publish the site only after backend health verification. Bootstrap Terraform changes are validated in CI but remain owner-run because they manage the deployment role and remote state.

The backend is managed by Terraform. A one-time bootstrap creates remote state storage, deployment identity, and account-budget notifications. Application deployment creates the API, serverless runtime, usage guard, and operational logs. The RAG implementation adds a private S3 document source, event queue, indexing worker, managed knowledge base, and S3 Vectors index. The document index starts empty. Follow [`future-rag-plan.md`](future-rag-plan.md) to find the output-based upload location after deployment.

The weekly report runs on Monday morning in New York time. It covers the preceding week and reports privacy-safe request outcomes, token counts, latency, safety-check and retrieval counts, plus account-wide AWS costs by service. Cost Explorer totals can lag and can include unrelated services. The email subscription requires confirmation in the destination inbox after initial deployment.

## Privacy and spend controls

Conversation history is held in browser memory and sent with bounded requests. Prompts, replies, document names, and document text are not written to application logs or the weekly report. The backend stores only an aggregate monthly request count. The public website receives no AWS credentials.

The monthly AWS budget sends email notifications when its thresholds are reached; it does not shut services off. The request quota and API throttling reduce usage but are not a guaranteed dollar cap. The public endpoint can be called outside a browser, since CORS is not authentication.

The application has no provisioned vector database or always-on compute. API requests, model inference, safety checks, document embeddings, knowledge-base retrieval, document and vector storage, logs, and report generation are usage-based. RAG uploads and searches can add charges. Review the current [Amazon Bedrock pricing](https://aws.amazon.com/bedrock/pricing/), [S3 pricing](https://aws.amazon.com/s3/pricing/), [S3 Vectors pricing](https://aws.amazon.com/s3/pricing/#Vectors), [API Gateway pricing](https://aws.amazon.com/api-gateway/pricing/), and [Lambda pricing](https://aws.amazon.com/lambda/pricing/) before changing usage limits. Free-tier eligibility and region affect actual charges.

## Local verification

```bash
./scripts/dev.sh
./scripts/setup-local.sh
./scripts/test.sh
```

The local site and mocked tests need no AWS credentials and make no paid model calls. Running the backend with live AWS credentials can incur inference and safety-check charges. Terraform validation checks configuration; it does not apply AWS changes.
