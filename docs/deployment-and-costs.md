# Deployment, setup, and cost notes

## Runtime map

```text
GitHub develop
  └─ verify: Starter/security checks + Python tests + Playwright + Terraform validation
     └─ AWS deploy job (GitHub OIDC)
        ├─ ECR: build and publish immutable Lambda image
        ├─ Terraform: Lambda + HTTP API + IAM + CloudWatch log groups
        └─ real chat smoke request
           └─ Pages job: publish only frontend/dist/ after backend succeeds
```

The site bundle includes the API URL, which is public routing information. It never contains an AI key. AWS credentials are short-lived OIDC credentials, and the AWS role trusts only this repository's `develop` branch. GitHub Pages uses a separate job/environment so the Pages environment subject does not broaden the AWS role trust.

## Deployment package boundaries

- `frontend/build.py` copies only the frontend redirect, `pages/`, `assets/`, and `images/` into `frontend/dist/`. It excludes unused Sass source, legacy `assets/js/main.js`, unused `assets/css/noscript.css`, and the chatbot config template. The deploy workflow uploads only `frontend/dist/` to Pages, so `backend/`, Project Starter tools/docs, tests, local resources, and agent skills are not published.
- `backend/Dockerfile` installs production dependencies from `backend/requirements.txt` and copies only `backend/src/` into the Lambda image. `backend/.dockerignore` keeps frontend files, Terraform, tests/dev dependencies, docs, caches, and local environment files out of the Docker context.
- GitHub Actions checks out the repository to run verification; the website and Lambda image have separate, bounded publish inputs. Project Starter files do not become runtime payload.

## Required owner setup

1. Install Python 3.12, Node.js 22+, Docker, Terraform 1.10+, and a native Apple Silicon AWS CLI v2.
2. Use a local AWS profile or Bedrock API key that can call the selected Bedrock model and `bedrock:InvokeGuardrailChecks`. Verify that the model is enabled in the chosen region.
3. Run the first bootstrap from `backend/infra/bootstrap` using local AWS credentials. Review the plan, then apply it to create the encrypted/versioned state bucket and the branch-restricted GitHub OIDC role. If the account already has a GitHub OIDC provider, supply its ARN rather than creating a duplicate.
4. Create `develop` from the current source, require the quality/security checks before merging, and protect `main` against direct pushes. Set GitHub Pages to **GitHub Actions**. This checkout removes the old `static.yml`, but the current remote `main` still contains that legacy workflow until the deletion reaches `main`; avoid direct pushes to `main` during cutover.
5. Set repository variables `AWS_REGION`, `TF_STATE_BUCKET`, and `AWS_ROLE_ARN` from the bootstrap outputs. Add `WEB3FORMS_KEY` as a repository secret for the existing contact form.
6. Check `allowed_origins` if a custom portfolio domain is added. The default includes the GitHub Pages origin and local port 8000.
7. Review the read-only AWS inventory and existing monthly charges before the first application apply. Keep the old chatbot active until the replacement has passed the real inference smoke check and the owner has reviewed a resource-by-resource retirement list.

The first application deploy creates the ECR repository, pushes the Lambda image, then applies the full Terraform root. Later `develop` pushes repeat image build, infrastructure update, static build, Pages publication, and one real inference check. Pull requests run mocked tests and Terraform validation without AWS permissions.

## Local setup and inference

```bash
./scripts/project start --task "Local portfolio/chatbot work"
./scripts/setup-local.sh
```

The setup script installs backend and frontend dependencies, downloads the Playwright Chromium browser, and creates `backend/.env` from a safe template without replacing an existing file. Add either `AWS_BEARER_TOKEN_BEDROCK` or configure `AWS_PROFILE` in `backend/.env`. Then run:

```bash
./scripts/dev.sh
```

Open `http://127.0.0.1:8000`; the chat posts to the local FastAPI server at `http://127.0.0.1:8001/chat`. Local live inference and the post-deploy smoke request call the same model profile, `us.anthropic.claude-haiku-5-5`, using the same backend code and prompt. Keep `BEDROCK_MODEL_ID` in `backend/.env` equal to the Terraform `bedrock_model_id` used by Lambda. Production credentials come from the Lambda execution role; a local AWS profile or Bedrock bearer token is only for local calls and is never put in website JavaScript. Unit and browser tests mock inference and do not need AWS credentials or make paid model calls. The profile and settings match by default, but generated text is not guaranteed to be identical from run to run because model inference is nondeterministic and the US profile can route across its supported US Regions.

## What gets monitored

- Lambda and API Gateway metrics are available in CloudWatch Metrics (invocations, errors, duration, throttles, HTTP 4xx/5xx).
- CloudWatch log groups keep structured application/access metadata for 14 days. Logs do not contain prompts, responses, or conversation history.
- Application events include request ID, outcome, model setting marker, HTTP status, latency, input/output token counts, and Guardrails text-unit counts.
- `backend/infra/terraform/README.md` includes Logs Insights queries for request outcome, latency, token usage, API failures, and throttling.
- No paid custom metrics, dashboard, alarm, database, transcript bucket, or tracing service is provisioned by this stack.

## Cost model

The backend uses on-demand services; none of API Gateway, Lambda, ECR, S3 state, IAM, or CloudWatch has provisioned compute in this design. Normal idle cost is expected to come from the retained Lambda image, a very small versioned Terraform state bucket, and any retained log bytes. Inference and Guardrails are the variable costs and can exceed infrastructure charges.

### Current account baseline (read-only historical bill)

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

*CloudWatch ingestion assumes roughly 1.35 KB of metadata per chat at `$0.50/GB`; actual record sizes and the shared free allowance change the bill. The 100,000-request Lambda example uses 150,000 GB-seconds and 100,000 requests; if the account's Lambda free allowances remain available and are not consumed by other functions, that line could be `$0`. Model usage assumes 600 input and 60 output tokens; adaptive thinking and actual conversation history can change the measured counts. The 300-token output ceiling still bounds the generated output budget. Replace token and text-unit assumptions with values logged after live requests. `guardrail_text_units` records usage totals without chat text. Each successful deployment also makes one real smoke inference request.

The API Gateway throttle of 0.25 requests/second with burst 1 is a best-effort traffic limit, not a monthly spend cap. At a continuous 15 requests/minute (about 648,000 per 30-day month), the conservative Guardrails estimate alone is about `$771/month`, plus model-token and service charges. A public unauthenticated endpoint can still be called outside browser CORS. Configure AWS Budget email alerts before public cutover; a budget alert is not a hard spend limit.

### Billing outside the new chatbot stack

- Old chatbot ECR, Lambda, API Gateway, and any Anthropic Marketplace charges continue until retired. The shared historical service totals above do not isolate those costs.
- Existing SageMaker Studio storage and EFS charges are separate from this app and continue while those resources are retained. The two Titanic async endpoints are separate and can scale from zero to two instances; do not delete them as part of chatbot retirement without confirming ownership.
- The existing Web3Forms contact form is a separate provider and requires `WEB3FORMS_KEY`; its plan/usage is outside AWS chatbot costs.
- Local unit and browser tests mock the model and incur no Bedrock charge. Running the local app with live Bedrock credentials incurs the same model and Guardrails charges as production.

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
