# Portfolio chatbot automated deployment

## Status

Accepted for the V0 portfolio assistant at the owner's request to build and operate the cheapest practical public chatbot. This decision applies only to this repository and deployment.

## Decision

An update merged to `develop` may automatically build and publish the Lambda container, apply the portfolio chatbot Terraform root, smoke-check the API, and publish the static site with that API endpoint. Pull request checks run before deployment and receive no AWS credentials. GitHub Actions assumes a short-lived AWS role through OIDC; its trust condition accepts only this repository's `develop` branch. The app role is scoped to the chatbot's Terraform state prefix and named ECR, Lambda, IAM, API Gateway, logs, and monthly usage table resources.

## Threat model and safeguards

- A pull request can execute checked-in tests and build code, but it cannot assume the AWS deploy role or access the remote Terraform state.
- The deployment role trust is restricted by both the GitHub OIDC audience and exact repository/branch subject. Repository variables contain only the role ARN and state bucket name.
- Workflow actions are pinned to immutable commit SHAs. Job permissions are minimal; only backend deployment receives OIDC token-write permission, and only Pages publication receives Pages write permission.
- Terraform state is private, encrypted, versioned, and limited to this app's key prefix. The deployment role cannot change the account budget, state bucket, or its own OIDC trust.
- API Gateway applies a best-effort throttle, Lambda reserved concurrency is one, and an atomic DynamoDB counter limits accepted model requests to 1,000 per UTC month. The account-wide $5 AWS budget sends notifications; it does not automatically stop spend.
- Prompts, answers, visitor identifiers, and IP addresses are not persisted. Runtime logs contain request metadata only.
- AWS resource deletion is not part of the deploy workflow. The owner separately authorized retirement of confirmed test/POC resources after the new public assistant is live and dependency checks pass.

## Operational gate

Protect `develop` so changes arrive through pull requests and successful quality checks before merge. Verify the published site's real `/chat` response before retiring old resources. Review budget alerts and request counts during the first month; revisit this design before adding persistent history, S3 ingestion, RAG, or further agent tools.
