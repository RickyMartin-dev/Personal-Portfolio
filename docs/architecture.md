# Architecture

## Product path

```text
Visitor browser
  ├── Static portfolio pages → GitHub Pages
  └── Chat panel → HTTPS API → serverless backend → language model
                                      ├── temporary browser history
                                      ├── bounded safety checks
                                      ├── aggregate usage guard
                                      └── optional document retrieval

Approved portfolio documents
  └── private S3 documents/ prefix
        └── notification → queue → indexing worker
              └── managed knowledge base → S3 Vectors

Weekly owner report
  └── schedule → report worker → usage metrics and account-wide cost summary → email
```

The site source, browser tests, and static build live in `frontend/`. Without a validated API endpoint, the build shows an under-construction notice and omits the chat client. With a validated HTTPS endpoint, it enables the accessible compact chat panel and mobile sheet. Backend source, infrastructure, tests, and project tooling are excluded from the Pages artifact.

## Chat and privacy

`backend/` owns the API and stateless agent flow. Each request may include a small recent history held in browser memory; closing or reloading the page clears it. The server applies a per-source 10-request/60-second limit before parsing chat payloads, rejects bodies over 32 KiB, and reserves from an aggregate 1,000-request monthly cap before validation or model work. The caller limiter stores a short-lived SHA-256 address digest and counter with TTL; logs contain only request outcomes, model usage, latency, and bounded retrieval counts. The server does not log prompts, replies, raw visitor addresses, document names, or document text.

The agent uses curated profile facts in `backend/src/config.py`. It receives a document search tool only when the knowledge base is configured. The prompt summarizes the index categories so the model can decide when search is useful. Retrieval is bounded to a small number of short passages; source text is treated as untrusted evidence, never instructions.

The knowledge base indexes only the S3 `documents/` prefix. Uploads, replacements, and deletions enqueue a sync; the worker starts an incremental Bedrock Knowledge Base ingestion job and retries failures through the queue and dead-letter queue. The public upload location is exposed as a Terraform output after deployment. Upload only material appropriate for portfolio visitors. See [`future-rag-plan.md`](future-rag-plan.md) for upload and recovery instructions.

## Delivery and monitoring

Feature branches target `develop`. Pull requests run starter/security checks, mocked backend tests, browser tests, static artifact validation, and Terraform formatting/validation without AWS credentials. A required merge gate combines the quality checks. Changes merged to the deployment branch trigger backend infrastructure and frontend publication from the same commit; the production job uses short-lived GitHub OIDC credentials and a protected deployment environment. Repository branch rules and environment reviewers are maintained in GitHub settings.

The weekly report runs Monday at 8 AM New York time and summarizes the previous week. It includes request outcomes, token totals, latency, safety-check usage, retrieval counts, and account-wide costs. Cost Explorer data can lag and is not attributed solely to the chatbot. Prompts, replies, and document content are excluded. The destination inbox must confirm the SNS subscription after the first deployment.

## Trust and cost boundaries

- Published JavaScript and HTML are public. Never place AI provider credentials in them.
- The browser calls the configured public endpoint; its history exists only for the page lifetime.
- Contact-form provider configuration is separate from the chatbot. Its public form identifier is not an AI credential.
- Infrastructure deployment manages only resources declared by this repository. It does not import or remove unrelated services.
- S3, vector storage, embeddings, retrieval, model inference, logging, and reporting are usage-based. Cost details are estimates and vary with traffic, data, and account free-tier use.
