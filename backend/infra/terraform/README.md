# Chatbot AWS infrastructure

This root manages the ECR image repository, Lambda container function, HTTP API Gateway, Lambda execution role, on-demand monthly usage counter, and short-retention CloudWatch log groups. It does not import or delete existing AWS resources. Use a new unique resource prefix or review existing AWS state before applying if any resources with the default names already exist.

The app root uses the remote S3 state bucket created by `../bootstrap`. Terraform's S3 backend uses native state locking and requires Terraform 1.10 or later.

## First deployment

The Lambda resource references an image that must already exist in ECR. The GitHub workflow should follow this order:

1. `terraform init` with `-backend-config="bucket=$TF_STATE_BUCKET" -backend-config="region=$AWS_REGION" -backend-config="encrypt=true" -backend-config="use_lockfile=true"`.
2. `terraform apply -target=aws_ecr_repository.chatbot` to create the repository before Lambda.
3. Read `terraform output -raw ecr_repository_url`, build `backend/Dockerfile` for `linux/amd64`, and push the image tagged with the commit SHA.
4. Run a full `terraform apply -var="image_tag=$GITHUB_SHA"` to create/update Lambda, API Gateway, IAM, and logs.
5. Read `terraform output -raw api_endpoint` and provide that exact `/chat` URL to the frontend build/deploy job. `terraform output -raw api_base_url` returns the base URL for `/health`.

On later deployments, skip the ECR target apply: build/push the new immutable commit tag, then run the full apply with that `image_tag`. Keep the S3 backend settings and the same backend key for every CI run.

## Resources and cost controls

- The HTTP API exposes `POST /chat` and `GET /health`; CORS allows only `allowed_origins` and has no API key embedded in the website.
- The on-demand DynamoDB table stores a UTC `YYYY-MM` key and aggregate count. Conditional writes enforce the 1,000 valid requests/month default across instances. It has deletion protection and contains no visitor or conversation data.
- The API accepts up to four prior chat messages and 2,000 history characters per request; this bounds repeated model input cost while preserving two recent exchanges.
- Model output is capped at 300 Bedrock tokens and the delivered text is capped at 2,000 characters before output safety checks; longer text is clipped with an ellipsis.
- API Gateway has a best-effort default-stage throttle of 0.25 requests/second and burst 1. Lambda reserved concurrency defaults to 1; Lambda timeout defaults to 28 seconds.
- Lambda uses a role scoped to the configured US inference profile and its backing foundation models, plus `bedrock:InvokeGuardrailChecks` (which is a resourceless IAM action and therefore needs `Resource = "*"`).
- Application and API access logs retain metadata only for 14 days. No request or response bodies are written to CloudWatch or S3.
- The access log omits client IP addresses. The application logs event/outcome, HTTP status, model ID, latency, token counts, and guardrail text-unit counts without chat text.
- ECR retains only the newest tagged image and expires untagged images after one day to keep storage small; rebuild an older commit to roll back.
- No VPC, NAT gateway, transcript bucket, database, or separate API key resource is created.

## CloudWatch observation

Use the CloudWatch Logs Insights console with the `/aws/lambda/personal-portfolio-chatbot` log group. The configured log groups expire events after 14 days. Queries run from the console are covered by CloudWatch's free tier allowance; large query scans beyond that allowance can incur charges.

Latest requests with status, outcome, token counts, guardrail usage, and latency:

```text
fields @timestamp, event, request_id, http_status, outcome, model_id,
       latency_ms, input_tokens, output_tokens, guardrail_text_units, error_type
| filter ispresent(event)
| sort @timestamp desc
| limit 100
```

Request totals and failures by five-minute window:

```text
filter event in ["chat.completed", "chat.invalid_request", "chat.bedrock_unavailable", "chat.internal_error"]
| stats count(*) as requests,
        sum(if(http_status >= 500, 1, 0)) as server_errors,
        sum(if(outcome = "blocked_input" or outcome = "blocked_output", 1, 0)) as blocked,
        avg(latency_ms) as avg_latency_ms,
        sum(input_tokens) as input_tokens,
        sum(output_tokens) as output_tokens
  by bin(5m)
```

For API Gateway throttles and HTTP errors, use the `/aws/apigateway/personal-portfolio-chatbot` log group:

```text
fields @timestamp, requestId, routeKey, status, integrationStatus,
       integrationLatency, responseLength
| filter status >= 400
| sort @timestamp desc
| limit 100
```

## Main variables and outputs

Use `-var-file` only for non-secret configuration and do not commit local `.tfvars` files. Defaults are in `variables.tf`.

| Input | Default | Purpose |
|---|---:|---|
| `aws_region` | `us-east-1` | Source AWS region and API/Lambda region |
| `bedrock_model_id` | `us.anthropic.claude-haiku-5-5` | Same model route as local inference |
| `allowed_origins` | GitHub Pages origin plus local ports | Browser CORS policy |
| `image_tag` | `bootstrap` | Existing ECR image tag used by Lambda |
| `max_output_tokens` | `300` | Bedrock response ceiling |
| `guardrail_block_threshold` | `0.5` | Enforced content/prompt-attack severity threshold |
| `api_throttle_rate` / `api_throttle_burst` | `0.25` / `1` | Best-effort API request throttle |
| `monthly_chat_limit` | `1000` | Shared hard cap on valid API requests per UTC month |

Outputs are `ecr_repository_url`, `api_endpoint` (the exact `/chat` URL), `api_base_url`, `lambda_function_name`, `lambda_log_group_name`, `api_access_log_group_name`, and `monthly_usage_table_name`.
