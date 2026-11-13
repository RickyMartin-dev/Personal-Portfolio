# AWS chatbot V0 deployment and cost guide

> The account-wide $5 monthly AWS budget, private Terraform state bucket, and `develop`-restricted GitHub OIDC role have been provisioned. The application stack is managed separately from existing POC resources. Price figures below are estimates; actual use and free-tier eligibility vary. Budget alerts report spend and do not shut services off.

## Active GitHub Pages path

```text
Push to develop
  └─ Mocked API/UI tests and Terraform validation
       └─ GitHub OIDC → Terraform app apply → Lambda image and HTTP API
            └─ /health smoke check → build Pages with endpoint → publish
```

GitHub Pages uses **GitHub Actions**. The repository default is `develop`, and the `github-pages` environment allows only `develop`. Pull requests to `develop` run checks without AWS credentials. A push to `develop` deploys the backend, smoke-checks `/health`, then publishes the active static chatbot. The historical `static.yml` on `main` is inactive.

The contact form uses the site's public Web3Forms access key, built in as `PUBLIC_WEB3FORMS_KEY` in `frontend/build.py`. It is a public client-side form identifier (it ships in the page HTML and can only deliver to the owner's registered address), not an AI credential. A `WEB3FORMS_KEY` environment value or secret overrides it; `WEB3FORMS_KEY=off` replaces the form with a direct email link.

## V0 stack and privacy

The V0 path is API Gateway HTTP API → Lambda container (FastAPI + LangGraph) → Bedrock. A DynamoDB on-demand table stores one integer request count for each UTC calendar month and stops new chat calls at 1,000. It stores no prompts, replies, visitor IDs, or IP addresses. If the shared counter is missing or unavailable, the API fails closed with 503. The API uses a best-effort 0.25 requests/second throttle, burst 1, Lambda reserved concurrency 1, 500-character input limit, at most four history messages/2,000 history characters, and 300 maximum output tokens.

The browser receives only the public `/chat` URL. Conversation history is held in page memory and discarded on page close. No provider credential or long-lived API key is published. Application and API logs omit message bodies, with 14-day retention.

### Artifact boundaries

- `frontend/build.py` copies the pages, required assets, and images into `frontend/dist/`. Without a validated `CHATBOT_API_ENDPOINT`, it omits the chat client/config and shows the under-construction notice. Production builds inject the exact endpoint and its origin into the public config and CSP.
- The Pages artifact contains only the static frontend. It does not publish `backend/`, Terraform, tests, documentation, local references, or Project Starter files.
- The backend workflow builds an immutable Linux/AMD64 Lambda image from `backend/Dockerfile` and retains only the newest tagged image.

### Bootstrap and deployments

1. The one-time bootstrap is in `backend/infra/bootstrap`: it provisions the private versioned state bucket, `develop`-only OIDC trust, scoped GitHub deploy role, and $5 account budget.
2. GitHub repository variables `AWS_ROLE_ARN` and `TF_STATE_BUCKET` hold non-secret identifiers. The workflow receives short-lived credentials through OIDC; no AWS access key is stored in GitHub.
3. Pushes to `develop` run the mocked tests, Terraform checks, ECR build/push, app Terraform apply, `/health` smoke check, and Pages publish.
4. The account budget sends alerts at 80% and 100% actual spend and 100% forecast spend. The DynamoDB chat quota is the hard request-count guardrail; the budget is not a hard dollar cap.
5. Keep the existing legacy chatbot live until the replacement passes the real `/chat` smoke check through the published site. Then follow `legacy-chatbot-cutover.md` to remove old resources and credentials after checking dependencies. The user has authorized retirement of testing/POC resources.
6. S3 ingestion and RAG remain future work in `future-rag-plan.md`; V0 creates no document bucket or index.

### Local static development and tests

```bash
./scripts/dev.sh
# Visit http://127.0.0.1:8000
```

This serves the static site only and needs Python 3, with no AWS or backend setup. For the full mocked test suite, run `./scripts/setup-local.sh` and `./scripts/test.sh`. Tests do not call Bedrock or make paid inference requests. Terraform validation is local/CI configuration validation only; it does not apply infrastructure.

## V0 monitoring

- Lambda and API Gateway metrics are available in CloudWatch Metrics (invocations, errors, duration, throttles, HTTP 4xx/5xx).
- Terraform configures CloudWatch log groups with 14-day retention. Application/access metadata omits prompts, responses, and conversation history.
- Application events include request ID, outcome, model setting marker, HTTP status, latency, input/output token counts, and Guardrails text-unit counts.
- `backend/infra/terraform/README.md` includes Logs Insights queries for request outcome, latency, token usage, API failures, and throttling.
- The app stack creates no paid custom metrics, dashboard, alarm, transcript bucket, or tracing service. The aggregate quota table is on-demand and stores only monthly counts.

## Estimated V0 cost model

These are planning estimates for the V0 design; exact charges depend on account free tier, usage, tokens, and AWS pricing. The design uses on-demand services with no provisioned compute. Idle cost can include the Lambda image, versioned Terraform state and state history, retained log bytes, and table storage. Inference and Guardrails are the variable charges, bounded by the shared request quota.

### Historical account baseline (read-only bill sample)

Cost Explorer for August–October 2026 showed an average account total of about `$1.075/month` including tax, before the new stack:

| Service or item | Historical monthly average | What the inventory says |
| --- | ---: | --- |
| ECR | `$0.411` | Account-wide across several repositories; the old `langraph-chatbot` repo has 17 large versions and is a likely contributor, but its exact share is not available from this service-level view. |
| SageMaker Studio gp3 storage | `$0.560` | Storage charges; not chatbot infrastructure. |
| EFS | `$0.051` | Account-wide file systems tagged to SageMaker domains; not chatbot infrastructure. |
| S3 | `$0.004` | Historical account-wide storage before the chatbot state bucket was created. |
| Tax | `$0.050` | Historical tax line. |
| **Total** | **`$1.075`** | Rounded to `$1.08/month`; a historical sample, not a forecast. |

This bill does not identify the old chatbot's exact API, Lambda, ECR, or model cost individually. The currently observed ECR amount is shared across repositories. The `legacy-chatbot-cutover.md` inventory identifies unrelated SageMaker items separately so chatbot cleanup does not accidentally remove them.

### New stack: recurring and per-use charges

Rates below are list-price references for `us-east-1` as of this document date. Free-tier eligibility depends on AWS account age and shared account usage; the estimate does not assume API Gateway or ECR free-tier eligibility.

| Component | How it is billed | Practical impact for this app |
| --- | --- | --- |
| Claude Haiku 5.5 on Bedrock | Tokens in and out. The `us.` inference profile uses the US cross-region tier: `$0.11/M` input and `$0.55/M` output tokens for prompts up to 100,000 tokens. Longer prompts have higher rates, but the app's bounded input is far below that threshold. | Main per-chat model charge. An illustrative 600 input + 60 output tokens costs about `$0.000099/chat`, or `$0.10/1,000 chats`. Actual token use is available in structured logs after successful calls. |
| Bedrock `InvokeGuardrailChecks` | `$0.07/1,000` text units for content filters and `$0.08/1,000` text units for prompt-attack checks. One unit covers up to 1,000 characters. | The current system prompt is 1,076 characters, so it is 2 units. The maximum bounded input is conservatively 7 units (system prompt + four history messages + current input); the response limit is 2,000 characters. The conservative maximum is `(7 × $0.15) + (2 × $0.07) = $1.19/1,000 chats`. A short first turn is about 3 input + 1 output unit, or `$0.52/1,000 chats`. AWS's public description does not fully clarify whether separate message blocks are rounded independently, so actual `usage.textUnits` returned by the API should replace this upper-bound assumption after the first live call. |
| API Gateway HTTP API | `$1.00/million` requests for the initial US East tier; no minimum fee. One million monthly API calls are free only for eligible new AWS customers for up to 12 months. | About `$0.001/1,000` requests at list price. Small request/response payloads keep transfer cost low. |
| Lambda | `$0.20/million` requests plus `$0.0000166667/GB-second` at the x86 on-demand rate in the first usage tier. Published monthly free allowances are 1 million requests and 400,000 GB-seconds, where applicable. | No charge while idle and no provisioned concurrency. At 512 MB and an illustrative 3-second execution, compute is `$0.000025/request` before free allowances; the actual time is measured by request logs and will mostly be remote model wait. |
| ECR | `$0.10/GB-month` private image storage; new ECR customers currently have 500 MB/month free for one year. | The Terraform lifecycle rule retains only the newest tagged image and expires untagged images after one day. At 326 MB, one wholly unique image is about `$0.03/month`; actual image bytes determine the bill. |
| CloudWatch Logs | Pay for ingested, retained, and query-scanned data. The published US East ingestion example is `$0.50/GB`; the current CloudWatch free-tier page includes 5 GB/month across logs ingestion, archive storage, and Logs Insights scans. | Two log groups retain metadata for 14 days. The app never logs prompts or replies, so expected log volume is small; no paid dashboard, alarm, custom metric, or tracing service is created. |
| S3 Terraform state | Standard storage, requests, and versioned objects. No always-on charge; old state versions expire after 90 days. | Expected to be a small fraction of a cent monthly at this repository's state size, subject to request volume and AWS minimum billing granularity. |
| GitHub Pages / CI | Pages is available for this public repository; GitHub-hosted standard runner usage is free for public repositories. | No separate hosting service or AWS static-site bucket/CDN is required. A custom domain/registrar, if used, is separate. |

### Example usage budget

This table assumes 600 input and 60 output model tokens per chat, a 512 MB Lambda running for 3 seconds, HTTP API list price, and the conservative maximum Guardrails count. It excludes storage, tax, contact-form provider charges, retries, and free-tier offsets:

| Chat requests/month | Model tokens | Guardrails | API Gateway | Lambda request + compute (gross) | CloudWatch log ingestion* | Estimated variable subtotal |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,000 | `$0.10` | `$1.19` | `$0.001` | `$0.025` | `<$0.001` | **`$1.32`** |
| 10,000 | `$0.99` | `$11.90` | `$0.01` | `$0.25` | `$0.007` | **`$13.16`** |
| 100,000 | `$9.90` | `$119.00` | `$0.10` | `$2.52` | `$0.068` | **`$131.59`** |

*CloudWatch ingestion assumes roughly 1.35 KB of metadata per chat at `$0.50/GB`; actual record sizes and the shared free allowance change the bill. The 100,000-request Lambda example uses 150,000 GB-seconds and 100,000 requests; if the account's Lambda free allowances remain available and are not consumed by other functions, that line could be `$0`. Model usage assumes 600 input and 60 output tokens; adaptive thinking and actual conversation history can change the measured counts. The 300-token output ceiling still bounds the generated output budget. `guardrail_text_units` records usage totals without chat text.

The shared DynamoDB counter stops valid chat requests at 1,000 per UTC month. At that limit, the conservative model/Guardrails/API/Lambda estimate is about `$1.32` in variable charges. Adding the sampled historical account baseline of `$1.08` gives roughly `$2.40/month` before the new state/image/log storage, tax, and usage variation. That estimate should stay below the `$5` alert threshold after POC resources are retired, but neither a request cap nor a budget alert is a hard dollar spending guarantee. API Gateway throttling is a secondary best-effort limit. A public unauthenticated endpoint can still be called outside browser CORS; requests stop at the monthly quota.

### Billing outside the new chatbot stack

- Old chatbot ECR, Lambda, API Gateway, and any Anthropic Marketplace charges continue until retired. The shared historical service totals above do not isolate those costs.
- Existing SageMaker Studio storage, EFS, and Titanic async test endpoints are separate POC costs. They remain until the new public assistant is verified, then the user-authorized cleanup can retire those resources after dependency checks.
- The existing Web3Forms contact form is a separate provider and requires `WEB3FORMS_KEY`; its plan/usage is outside AWS chatbot costs.
- Local unit and browser tests mock the model and incur no Bedrock charge. The current `scripts/dev.sh` serves the static site; a local backend run with live Bedrock credentials incurs model and Guardrails charges.

## References

- [Claude Haiku 5.5 on Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-5-5.html)
- [Anthropic's current AWS Bedrock model price sheet](https://assets.claude.com/5633dc848caa431115468f31c7085d695bbfb9cc.pdf)
- [Amazon Bedrock pricing, including `InvokeGuardrailChecks`](https://aws.amazon.com/bedrock/pricing/)
- [Bedrock `InvokeGuardrailChecks` behavior and usage](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-invoke-guardrail-checks.html)
- [API Gateway HTTP API pricing and throttling](https://aws.amazon.com/api-gateway/pricing/)
- [AWS Lambda pricing](https://aws.amazon.com/lambda/pricing/)
- [ECR pricing](https://aws.amazon.com/ecr/pricing/)
- [CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/)
- [GitHub Pages availability and limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
