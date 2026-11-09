# Legacy chatbot and cutover notes

## Where the previous code lives

The current local snapshot `resources/Website_AI_Chatbot/` is the separate chatbot backend repository. Its Docker/FastAPI/LangGraph app and GitHub Actions workflow build and publish a Lambda container from that repo. It references ECR/Lambda configuration through GitHub secrets, but it does not contain Terraform or an API Gateway definition.

The portfolio repo previously connected the browser to that backend through `CHATBOT_API_ENDPOINT` in `.github/workflows/static.yml`. The deploy workflow generated `assets/js/chatbot.config.js` with the endpoint and a browser-visible API key. The actual API Gateway ID, route, Lambda function name, IAM roles, and current bill are AWS account state; they are not recoverable from either checked-out source tree alone.

The root repo now owns the replacement frontend, backend, Terraform, and `develop` deployment workflow. The old repo and endpoint must remain intact until the new API returns a real model response and the owner reviews the old resource inventory. The new workflow has no chatbot API key input.

## Read-only AWS inventory (2026-11-08)

The AWS CLI was authenticated and enabled regions were checked without making changes. The chatbot-related resources found were in `us-east-1`:

- The live-looking HTTP API is named `chatbot-api-v1`. Its `POST /chat` route invokes the Lambda function also named `chatbot-api-v1`, which runs an image from ECR repository `langraph-chatbot`. This matches the separate repo's `main` workflow, which builds the image and calls `lambda update-function-code` using its `ECR_REPOSITORY` and `LAMBDA_FUNCTION_NAME` secrets.
- That HTTP API route has `AuthorizationType: NONE`; its default stage has no configured API throttle or access-log destination. The Lambda environment includes `API_KEY` and LangSmith-related variable names. The function role includes the broad managed policy `AmazonBedrockFullAccess`. Secret values were not read or copied.
- The older REST API named `newChatAPI` has `POST /ask` integrated with the separate `chatLambda` function and stages named `dev` and `Testing_website`. A Lambda permission also references an API ID that is no longer returned by the API inventory; treat that as a stale permission candidate, not proof that it can be removed.
- `chatbot-api-v0` has no API Gateway invoke permission in its current Lambda resource policy. The `langraph-chatbot` repository contains 17 image versions, each roughly 325 MB, including the digest currently used by `chatbot-api-v1`.
- Lambda log groups for the old chatbot have no retention setting, so they retain logs indefinitely. API Gateway access logging was not configured on the active HTTP API stage.

Cost Explorer for the three completed months August–October 2026 shows an account baseline of about `$1.08/month` including tax: ECR `$0.411`, SageMaker Studio gp3 volume `$0.56`, EFS `$0.0505`, S3 `$0.0036`, and tax `$0.05`. ECR charges are account-wide, not allocated to a single repository; `langraph-chatbot` is a likely contributor because it retains the image versions above.

The same inventory found two unrelated Titanic async SageMaker endpoints, both currently `InService` with desired/current instance count zero and autoscaling from zero to two `ml.m5.large` instances. It also found two active SageMaker Studio domains, three SageMaker-managed EFS file systems, and a stopped notebook. The observed SageMaker charge is for Studio storage, not endpoint compute, during those completed months. These may be candidates for later cleanup, but they are not part of the chatbot and have not been changed.

This inventory is a point-in-time snapshot, not Terraform state. It does not establish ownership for every account resource or allocate shared service charges exactly. Do not import, pause, or delete old resources until the replacement has passed a real inference check and the owner has reviewed a resource-by-resource retirement list.

## Read-only inventory required before cleanup

Use a working native AWS CLI v2 and the intended profile to record:

- caller identity and active region;
- API Gateway HTTP/REST APIs, routes, stages, access log destinations, and throttles;
- each candidate Lambda function's role, image/code source, memory, timeout, concurrency, and last modified time;
- ECR repositories and image storage;
- IAM roles/policies that grant Bedrock invocation;
- CloudWatch log groups, retention, stored bytes, and recent invocation/error metrics;
- S3 buckets, lifecycle/retention rules, and Terraform state ownership;
- Cost Explorer/service cost for at least the last three months, where available.

Do not infer that an AWS resource belongs to the old chatbot only from a familiar name. Capture IDs, ARNs, tags, deployment source, and dependencies. After the new stack is live, prepare a separate exact cleanup proposal with current monthly cost and dependencies for owner review. No legacy AWS resource is deleted or paused by this repository's deployment workflow.

## Retirement runbook for the old chatbot

The old `resources/Website_AI_Chatbot/` checkout contains application code and a GitHub Actions image-publish workflow, not the Terraform state or a complete AWS resource definition. Its workflow deploys the Lambda container to ECR/Lambda. The API Gateway, Lambda, IAM, ECR, and CloudWatch objects below live in the AWS account. The new Terraform root does not import, manage, or delete them.

### Candidate resource map

| Resource | Snapshot identity | Retirement condition |
| --- | --- | --- |
| HTTP API `chatbot-api-v1` | API ID `wcjd9zbi85`, route `POST /chat`, default auto-deploy stage | Candidate to delete after the new `/chat` route is live, tested, and old API request metrics show no remaining clients. |
| Lambda `chatbot-api-v1` | Name `chatbot-api-v1`; image points to `langraph-chatbot` | Candidate after the old API and all other event sources/aliases stop invoking it. Inspect its exact image URI and execution role first. |
| ECR `langraph-chatbot` | 17 image versions, each displayed around 325 MB | Candidate after confirming no retained Lambda version or other consumer refers to any image digest. Deleting the repository with `--force` irreversibly deletes its images. |
| REST API `newChatAPI` | API ID `garouramdf`; `POST /ask`; stages `dev` and `Testing_website` | Review candidate only. Check stages, recent API metrics, access logs, and website/source references before deletion. |
| Lambda `chatLambda` | Name `chatLambda`; integrated with `newChatAPI` | Review candidate only; verify all API routes and non-API event sources before deletion. |
| Lambda `chatbot-api-v0` | Name `chatbot-api-v0`; no current API Gateway invoke permission was found | Review candidate only; check aliases, event sources, function URLs, schedules, and recent invocations before deletion. |
| Old chatbot Lambda roles/policies | Role names and ARNs must be read from the live Lambda configurations | Delete only a role proven to be dedicated to retired functions and not trusted by another workload. The v1 function had broad `AmazonBedrockFullAccess`; do not detach a shared policy/role. |
| Old Lambda CloudWatch log groups | Previously found without retention; exact names must be re-read | Decide whether logs need retention first. Delete only logs belonging to the retired functions after any required retention/export period. |
| Stale Lambda invoke permission | A statement referenced an API ID not returned by the API inventory | Inspect the live function policy and remove only the exact stale statement ID after confirming the referenced API is gone. |

The old website's workflow injected an API key into browser JavaScript. Treat that key as public and do not reuse it. The old Lambda also had an `API_KEY` environment-variable name, but secret values were not read. Rotate/revoke any exposed key and any old-repo AWS credential after identifying whether another workload shares it.

### Safe cutover sequence

1. Deploy from this repository's `develop` branch. Verify the new API's `/health`, a real `/chat` response through the published site, CloudWatch request logs, and the GitHub Pages deployment. Confirm the model/profile is `us.anthropic.claude-haiku-5-5` and no key appears in the static artifact.
2. Record a fresh read-only AWS inventory and current Cost Explorer data. Confirm caller account and `us-east-1`; retrieve API routes/stages, Lambda versions/aliases/event sources/image URIs/roles, ECR image digests, CloudWatch groups/retention, IAM policies, and recent metrics. The table above is a names-only snapshot and is not sufficient authorization for a delete command.
3. Check which pages, DNS entries, local checkouts, or external clients still call the old API. Observe the old API and Lambda metrics/logs for an interval appropriate to the old site's traffic; a quiet interval alone does not prove no hidden client remains.
4. Disable the old repository's `deploy.yml` workflow so it cannot republish obsolete code. After confirming the new endpoint is carrying traffic, revoke the browser-exposed API key and any dedicated legacy AWS access key. Do not delete a credential that another repository or workload still uses.
5. Delete the specifically approved API Gateway API(s), then their unused Lambda functions/versions and dedicated execution roles/policies. Delete old log groups only after deciding whether to retain the history. Delete `langraph-chatbot` images last, after verifying no Lambda image URI or other consumer points to them.
6. Re-run read-only inventories and Cost Explorer after the next billing cycle. Compare ECR, Lambda, API Gateway, CloudWatch, and Anthropic/Marketplace charges to verify the old spend stopped.

### Read-only preflight examples

Run these with the intended AWS profile and region. They inspect current state; they do not change it.

```bash
aws sts get-caller-identity
aws apigatewayv2 get-api --api-id wcjd9zbi85 --region us-east-1
aws apigatewayv2 get-routes --api-id wcjd9zbi85 --region us-east-1
aws apigatewayv2 get-stages --api-id wcjd9zbi85 --region us-east-1
aws apigateway get-resources --rest-api-id garouramdf --region us-east-1
aws apigateway get-stages --rest-api-id garouramdf --region us-east-1
aws lambda get-function --function-name chatbot-api-v1 --region us-east-1
aws lambda list-event-source-mappings --function-name chatbot-api-v1 --region us-east-1
aws lambda get-function-configuration --function-name chatbot-api-v1 --region us-east-1
aws ecr describe-images --repository-name langraph-chatbot --region us-east-1
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/chatbot-api --region us-east-1
aws iam list-attached-role-policies --role-name <role-from-lambda-configuration>
aws iam list-role-policies --role-name <role-from-lambda-configuration>
```

Also inspect `chatLambda` and `chatbot-api-v0` with the Lambda commands above. Do not print or copy environment variable values into notes: record only names, role ARN, image URI, dates, aliases, and dependency identities. If the AWS CLI session expires or network access fails, refresh the read-only inventory before making any retirement decision.

### Destructive commands (run only for reviewed, confirmed resources)

These examples are intentionally separated from the preflight. Deleting either API, functions, logs, roles, or the ECR repository can interrupt clients or destroy history. Confirm the live IDs and dependencies immediately before each operation.

```bash
# Old v1 HTTP API: deletes all routes, integrations, and stages in this API.
aws apigatewayv2 delete-api --api-id wcjd9zbi85 --region us-east-1

# Older REST API: delete only after confirming both listed stages are unused.
aws apigateway delete-rest-api --rest-api-id garouramdf --region us-east-1

# Delete only functions confirmed unused by every API and event source.
aws lambda delete-function --function-name chatbot-api-v1 --region us-east-1
aws lambda delete-function --function-name chatbot-api-v0 --region us-east-1
aws lambda delete-function --function-name chatLambda --region us-east-1

# Delete only after all Lambda versions/functions using this image repository are gone.
aws ecr delete-repository --repository-name langraph-chatbot --force --region us-east-1

# Only for a dedicated role whose functions and trust relationships were reviewed.
aws iam detach-role-policy --role-name <confirmed-role> \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
aws iam delete-role-policy --role-name <confirmed-role> --policy-name <confirmed-inline-policy>
aws iam delete-role --role-name <confirmed-role>

# Only after deciding to permanently discard the named function's CloudWatch history.
aws logs delete-log-group --log-group-name <confirmed-log-group> --region us-east-1
```

The role names, inline policy names, statement IDs, and CloudWatch log group names must come from the fresh preflight; this snapshot intentionally does not invent them. Inspect the attached and inline policies first; detach/delete only policies proven to be legacy-only, then delete the role. Removing a stale invoke permission requires the exact statement ID from `aws lambda get-policy`; do not guess it. Disable the old repository workflow in its GitHub Actions settings (or with `gh workflow disable deploy.yml --repo RickyMartin-dev/Website_AI_Chatbot`) only after replacement traffic is confirmed. Do not delete the new Terraform-managed `personal-portfolio-chatbot` ECR/Lambda/API/log groups, the new state bucket or OIDC role, CDK asset repositories, Titanic model repositories, SageMaker domains, or EFS filesystems as part of this chatbot cleanup.
