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

Feature branches target `develop`. Pull requests run starter/security checks, mocked backend tests, browser tests, static artifact validation, and Terraform formatting/validation without AWS credentials. A required merge gate combines the quality checks.

Pushes to `develop` run the checks again and classify the complete change set since the last successful release. Backend runtime or application Terraform changes deploy through short-lived GitHub OIDC credentials and the protected `aws-production` environment. Frontend changes publish Pages; mixed changes publish Pages only after backend health succeeds; docs/tests-only changes do not publish. If the release baseline is unavailable, both deployment lanes run conservatively. Bootstrap Terraform is validated but remains owner-run because it manages deployment identity and remote state.

The workflow checks the planned and applied API endpoint against `frontend/production-api-endpoint.txt`. API Gateway is protected from accidental replacement with Terraform `prevent_destroy`. The production Pages build uses that reviewed endpoint to activate the chatbot. Before publishing, CI verifies the built client, its endpoint and CSP, then checks the live API health route and exact Pages-origin CORS. A local build without `CHATBOT_API_ENDPOINT` remains disabled by default.

The weekly report is scheduled for Monday at 8 AM New York time and summarizes the previous week. EventBridge retries failed invocations twice over up to one hour. A CloudWatch alarm emails the report owner if the report Lambda records an error. The email includes a section for each explicitly registered agent: requests, outcomes, latency, safety-check and retrieval counts, tokens, and estimated model inference cost from the configured per-model token rates. These estimates exclude shared Lambda, API Gateway, logging, storage, and retrieval costs; Cost Explorer totals are reported separately at account level, may lag, and are not attributed solely to any agent. Prompts, replies, and document content are excluded.

The portfolio chatbot has stable ID `portfolio_chatbot`. To add an agent, set its `AGENT_ID` on the workload, emit structured usage events with that ID, and add an entry to `backend/infra/terraform/agent-registry.auto.tfvars.json` with the display name, approved CloudWatch log group, and input/output USD-per-million-token rates. The weekly report Lambda IAM policy is scoped to only the registered log groups; it does not discover or read every log group in the account. Keep shared AWS infrastructure costs separate as account-wide amounts.

### Private Vault metrics view (planned, not connected)

The Vault is a separate Cloudflare Pages application behind Cloudflare Access. It currently has no AWS metrics endpoint or live portfolio-agent data. To add a read-only view, route only `/api/portfolio-metrics` through a lightweight Pages Function. The Function validates the Access assertion and forwards it to a separate AWS API Gateway metrics route. AWS must independently verify the JWT signature, configured issuer, Vault application's audience, expiry, and the small approved-user list; the Access login gate on the static page alone does not authorize AWS requests.

That AWS route should invoke a dedicated metrics Lambda with read-only IAM access limited to the chatbot's CloudWatch log group, API Gateway metrics, and monthly usage table. It should return bounded aggregates such as request counts, outcomes, token totals, latency, RAG usage, and estimated model spend, never prompts, replies, document text, or raw visitor identifiers. Do not call Cost Explorer on each dashboard refresh: each paginated API request costs $0.01, and its service-level charges are account-wide rather than attributable to this chatbot alone. Keep actual account-cost reporting in the weekly email; query the dashboard only on open or explicit refresh, limit the date range, and avoid frequent polling. Keep AWS credentials out of the browser and do not reuse the public `/chat` endpoint as a monitoring API.

## Trust and cost boundaries

- Published JavaScript and HTML are public. Never place AI provider credentials in them.
- Production chat uses Amazon Nova Micro only; the Lambda role boundary allows no higher-cost generative model, and there is no model fallback. Output is capped at 300 tokens and usage at 1,000 chat requests per UTC month.
- The browser calls the configured public endpoint; its history exists only for the page lifetime.
- Contact-form provider configuration is separate from the chatbot. Its public form identifier is not an AI credential.
- Infrastructure deployment manages only resources declared by this repository. It does not import or remove unrelated services.
- S3, vector storage, embeddings, retrieval, model inference, logging, and reporting are usage-based. Cost details are estimates and vary with traffic, data, and account free-tier use.
