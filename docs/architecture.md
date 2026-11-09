# Architecture

## Runtime layout

```text
Browser
  ├── Static portfolio: GitHub Pages artifact built from frontend/
  └── Chat POST /chat
        └── API Gateway HTTP API (CORS + aggregate best-effort throttle)
              └── Lambda container (FastAPI + LangGraph)
                    ├── Bedrock Guardrails checks
                    └── Amazon Bedrock Claude Haiku inference
```

The source repo keeps the static site and browser suite in `frontend/`, and the API, Lambda package, Terraform, and backend suite in `backend/`. GitHub Pages receives only `frontend/dist/`; backend source, Terraform state/configuration, and agent docs are not published.

## Chat data flow

- The browser keeps the current conversation in JavaScript memory and clears it on reload or page close.
- Each request contains the current user message and at most two complete prior exchanges (four messages and 2,000 history characters). The backend validates roles, content, per-message size, and total size before inference.
- The backend checks user input for prompt attacks/content and checks the reply for harmful content. A flagged input is rejected before inference; a flagged reply is replaced with a generic message.
- Conversation text is not stored in an application database, S3, local storage, or logs. Logs contain request ID, model ID, token counts, latency, outcome, and status only.
- The response contract remains `{ "message": string }`. Rate-limit rejection returns HTTP 429 with a generic retry message.

## AWS ownership

- `backend/infra/terraform/` manages the application ECR repository, Lambda, IAM execution role and Bedrock permissions, API Gateway HTTP API/route, throttling, and CloudWatch retention.
- `backend/infra/bootstrap/` provisions the remote Terraform state bucket and GitHub OIDC deploy role. The role trust is restricted to this repository's `develop` branch.
- The Lambda role invokes the configured Bedrock model and Guardrails checks. The browser receives no AI credential. Local development uses an AWS profile or an ignored Bedrock API key.
- No VPC/NAT, provisioned concurrency, permanent chat store, LangSmith tracing, or S3 transcript logging is enabled in v1.

## CI/CD and branch flow

- Feature branches open pull requests to `develop`.
- Pull requests run Project Starter checks, backend tests with AWS clients mocked, browser tests with the API mocked, secret checks, and Terraform format/validation. No AWS credentials or remote plan are used on pull requests.
- A push or merge to `develop` verifies the change, builds a commit-tagged Lambda image, applies Terraform through GitHub OIDC, runs one real inference smoke check, then publishes only the frontend Pages artifact. The AWS job has no GitHub environment so OIDC trust remains pinned to the `develop` ref; Pages publication is a separate environment job.
- The new workflow does not trigger on `main`. The current remote `main` still contains its legacy Pages workflow until its deletion is merged there, so protect `main` from direct pushes during cutover. After that merge, use `develop` for the production deployment stream and keep `main` as the protected history/release branch.

## Future data integrations

S3 document upload/indexing and read-only GitHub context are deferred. When enabled, S3 uploads should trigger a bounded ingestion job that updates a vector index; GitHub access should use an allowlisted read-only integration. Neither capability grants the model raw AWS credentials, arbitrary network access, or GitHub write permissions.

## Trust boundaries

- Public browsers and all submitted text are untrusted. CORS only controls browsers and is not API authentication.
- API Gateway throttling is an aggregate best-effort target of 15 requests/minute, not a guaranteed monthly spend cap.
- Model and Guardrails calls are pay-per-use. Output and context limits reduce token cost; monitoring logs never include prompts or responses.
- Existing AWS resources stay live during cutover. Resource retirement requires a reviewed inventory and owner confirmation.
