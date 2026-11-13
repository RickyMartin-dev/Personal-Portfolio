# Architecture

## Active product path

```text
Visitor browser
  └── Static portfolio pages, styles, and scripts
        └── GitHub Pages

  └── Public HTTPS /chat endpoint
        └── API Gateway HTTP API
              └── Lambda container
                    ├── FastAPI + stateless LangGraph turn
                    ├── DynamoDB aggregate monthly request cap
                    └── Bedrock model + inline safety checks
```

The site source, browser tests, and static build live in `frontend/`. The site is the v0 "Aurora Lines" design (home, About, Games; plain HTML/CSS/JS, fonts from Google Fonts, theme follows the OS); `design-showcase/aurora-final/` and `studio/` are its design source. Without `CHATBOT_API_ENDPOINT`, `frontend/build.py` publishes the accessible under-construction notice and omits the chatbot client/config. With a validated HTTPS `/chat` endpoint, the build enables the compact desktop panel/mobile sheet and injects that public endpoint into the CSP and config. Backend source, Terraform, tests, and Project Starter files are excluded from Pages.

## Chat request and privacy boundaries

`backend/` owns the FastAPI API, stateless LangGraph flow, Lambda image, and Terraform. Each request includes up to two recent exchanges stored only in browser page memory. The server validates message and history sizes and stores only the UTC month and aggregate request count in DynamoDB. A conditional update enforces the 1,000-request monthly cap across Lambda instances. If the counter cannot be reached, the API fails closed with 503. Lambda logs keep request IDs, outcome, model, latency, token counts, and safety-check units; request/response text is not logged.

Bedrock receives the bounded turn and calls inline safety checks before and after generation. Output is limited to 300 model tokens. The API is public and unauthenticated; CORS only limits browser origins, so API Gateway throttling, Lambda concurrency 1, and the shared monthly cap provide the request controls. The $5 account budget sends alerts at 80% and 100% actual spend and 100% forecast; it is not an automatic service shutoff.

## GitHub Actions and branch flow

- Feature branches open pull requests to `develop`.
- Pull requests run Project Starter/security checks, mocked backend and artifact tests, Playwright browser tests, and Terraform format/validation. These checks use no AWS credentials or remote Terraform state.
- Pull requests to `develop` run mocked API/UI tests and Terraform validation without AWS credentials.
- Pushes to `develop` run verification, assume the branch-restricted deployment role through GitHub OIDC, build and push the Lambda image, apply the app Terraform root, smoke-check `/health`, then build Pages with the resulting public endpoint.
- The bootstrap root creates the private versioned state bucket, `develop`-only OIDC role, and account-wide $5 budget. GitHub repository variables `AWS_ROLE_ARN` and `TF_STATE_BUCKET` contain non-secret resource identifiers.

## Trust and cost boundaries

- Published JavaScript and HTML are public. Never put AI provider credentials in them.
- Chat requests are sent directly from the browser to the configured public endpoint. The site does not store them beyond the page lifetime.
- The contact form uses Web3Forms. Its access key is a public client-side form identifier built into `frontend/build.py` (overridable with `WEB3FORMS_KEY`), not an AI secret.
- The prior POC resources remain outside new Terraform state until cutover and dependency checks complete. The replacement deployment never imports or deletes them. After live smoke verification, follow [`legacy-chatbot-cutover.md`](legacy-chatbot-cutover.md) and the owner-authorized cleanup scope.
- S3 document ingestion and RAG are future work; the planned event-driven full reindex is in [`future-rag-plan.md`](future-rag-plan.md).
