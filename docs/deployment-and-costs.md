# AWS backend deployment and cost reference (inactive)

> Current work targets GitHub Pages only. The chatbot is marked under construction; this repository's Pages workflow does not use AWS, Terraform apply, Lambda, API Gateway, or live model inference. No AWS resource was changed. The cost figures below are retained planning estimates and historical observations, not charges created by the active Pages workflow.

## Active GitHub Pages path

```text
Push to develop
  └─ Project Starter, mocked backend, artifact, and browser verification
       └─ build frontend/dist/
            └─ publish static artifact through GitHub Pages Actions
```

GitHub Pages must be configured to use **GitHub Actions**. The public repository's default branch was `main` and it had no remote `develop` branch at the last check. The remote `main` revision still contained a legacy Pages workflow; keep `main` unchanged until the `develop` Pages path is ready and the legacy workflow can be retired safely.

`WEB3FORMS_KEY` is optional and only configures the contact form. If present, it is injected into client-side form markup and is therefore a public form identifier, not an AI credential. Without it, the Pages build succeeds and the contact form stays unconfigured.

## Retained backend design

The repository retains FastAPI/LangGraph source and Terraform under `backend/` for a later, separately reviewed chatbot launch. The planned path is API Gateway HTTP API → Lambda container → Bedrock. The browser should never receive an AI provider key. Backend monitoring, budgets, endpoint security, and a deliberate inference smoke check must be reviewed before this infrastructure is applied or the frontend notice is removed.

### Artifact boundaries

- `frontend/build.py` copies the root redirect, `pages/`, required site assets, and `images/` into `frontend/dist/`. It excludes the legacy chat API client/config, unused Sass, template JavaScript/CSS, and repository tooling.
- The Pages workflow publishes only `frontend/dist/`; it does not access or publish `backend/`, Terraform, tests, documentation, local references, or Project Starter files.
- `backend/Dockerfile` and `.dockerignore` retain a separate bounded Lambda image build for future use; that image is not built in the current workflow.

### Future backend setup (not needed for Pages)

The following is a reference for a later backend deployment. Do not run it as part of static site development: it requires AWS credentials and can create billable resources.

1. Install Python 3.12, Node.js 22+, Docker, Terraform 1.10+, and AWS CLI v2.
2. Confirm Bedrock model and Guardrails access in the chosen region and add cost alerting before enabling public inference.
3. Review the Terraform plan and use the bootstrap root only when deliberately creating remote state and a GitHub OIDC deployment role.
4. Restrict the OIDC trust to this repository and intended deploy branch. Keep provider credentials in Lambda/backend configuration, not in browser files.
5. Review the existing AWS inventory, monthly bill, resource ownership, and cleanup targets before creating or deleting any resource.
6. Re-enable the chat client only after the API, monitoring, budgets, throttling, and mocked tests have been reviewed.

### Local static development and tests

```bash
./scripts/dev.sh
# Visit http://127.0.0.1:8000
```

This serves the static site only and needs Python 3, with no AWS or backend setup. For the full mocked test suite, run `./scripts/setup-local.sh` and `./scripts/test.sh`. Tests do not call Bedrock or make paid inference requests. Terraform validation is local/CI configuration validation only; it does not apply infrastructure.

## Monitoring planned for a future backend

- If the backend is deployed, Lambda and API Gateway metrics will be available in CloudWatch Metrics (invocations, errors, duration, throttles, HTTP 4xx/5xx).
- The Terraform design configures CloudWatch log groups with 14-day retention. Intended application/access metadata omits prompts, responses, and conversation history.
- Application events include request ID, outcome, model setting marker, HTTP status, latency, input/output token counts, and Guardrails text-unit counts.
- `backend/infra/terraform/README.md` includes Logs Insights queries for request outcome, latency, token usage, API failures, and throttling.
- The current Pages deployment provisions no CloudWatch resources. The retained Terraform design creates no paid custom metrics, dashboard, alarm, database, transcript bucket, or tracing service.

## Estimated cost model if backend is reactivated

These are planning estimates for the retained backend design, not current costs from this repository's Pages workflow. The design uses on-demand services with no provisioned compute. If deployed, idle cost would be expected from the retained Lambda image, a small versioned Terraform state bucket, and retained log bytes. Inference and Guardrails are the variable charges and can exceed infrastructure charges.

### Historical account baseline (read-only bill sample)

Cost Explorer for August–October 2026 showed an average account total of about `$1.075/month` including tax, before the new stack:

| Service or item | Historical monthly average | What the inventory says |
| --- | ---: | --- |
| ECR | `$0.411` | Account-wide across several repositories; the old `langraph-chatbot` repo has 17 large versions and is a likely contributor, but its exact share is not available from this service-level view. |
| SageMaker Studio gp3 storage | `$0.560` | Storage charges; not chatbot infrastructure. |
| EFS | `$0.051` | Account-wide file systems tagged to SageMaker domains; not chatbot infrastructure. |
| S3 | `$0.004` | Account-wide; the new Terraform state bucket does not exist yet. |
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
| ECR | `$0.10/GB-month` private image storage; new ECR customers currently have 500 MB/month free for one year. | The Terraform lifecycle rule retains five tagged images plus untagged images for one day. At 326 MB per wholly unique image, one retained image is about `$0.03/month`; five wholly unique copies would be about `$0.16/month`. This is an illustration based on the old image size; the new image's actual stored bytes determine the bill. |
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

*CloudWatch ingestion assumes roughly 1.35 KB of metadata per chat at `$0.50/GB`; actual record sizes and the shared free allowance change the bill. The 100,000-request Lambda example uses 150,000 GB-seconds and 100,000 requests; if the account's Lambda free allowances remain available and are not consumed by other functions, that line could be `$0`. Model usage assumes 600 input and 60 output tokens; adaptive thinking and actual conversation history can change the measured counts. The 300-token output ceiling still bounds the generated output budget. Replace token and text-unit assumptions with values logged after any approved live requests. `guardrail_text_units` records usage totals without chat text. A live smoke inference is not part of the current Pages deployment.

The Terraform design's API Gateway throttle of 0.25 requests/second with burst 1 would be a best-effort traffic limit, not a monthly spend cap. At a continuous 15 requests/minute (about 648,000 per 30-day month), the conservative Guardrails estimate alone is about `$771/month`, plus model-token and service charges. A public unauthenticated endpoint can still be called outside browser CORS. Configure AWS Budget email alerts before any future public cutover; a budget alert is not a hard spend limit.

### Billing outside the new chatbot stack

- Old chatbot ECR, Lambda, API Gateway, and any Anthropic Marketplace charges continue until retired. The shared historical service totals above do not isolate those costs.
- Existing SageMaker Studio storage and EFS charges are separate from this app and continue while those resources are retained. The two Titanic async endpoints are separate and can scale from zero to two instances; do not delete them as part of chatbot retirement without confirming ownership.
- The existing Web3Forms contact form is a separate provider and requires `WEB3FORMS_KEY`; its plan/usage is outside AWS chatbot costs.
- Local unit and browser tests mock the model and incur no Bedrock charge. The current `scripts/dev.sh` serves only the static site. A future locally enabled backend using live Bedrock credentials would incur model and Guardrails charges.

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
