# Portfolio chatbot automated deployment

## Status

Accepted for the V0 portfolio assistant at the owner's request to build and operate the cheapest practical public chatbot. This decision applies only to this repository and deployment.

## Decision

An update merged to `develop` runs release checks and routes deployment based on the full change set since the latest successful release. Backend runtime or application Terraform changes may build and publish the Lambda container and apply the chatbot Terraform root; frontend changes publish the static site; mixed changes publish Pages only after the API health check; docs/tests-only changes do not publish. Bootstrap Terraform is validated by CI but remains a separate owner-run operation because it manages deployment identity and remote state. Pull request checks receive no AWS credentials. GitHub Actions assumes a short-lived AWS role through OIDC; its trust condition accepts only this repository's `aws-production` environment subject. The workflow runs only from `develop`; GitHub restricts that environment to `develop` and requires the owner's approval. The deploy role manages the chatbot's Terraform state prefix and named application resources; runtime roles are constrained by an IAM permissions boundary.

## Threat model and safeguards

- A pull request can execute checked-in tests and build code, but it cannot assume the AWS deploy role or access the remote Terraform state.
- The deployment role trust is restricted by the GitHub OIDC audience and exact repository/environment subject. Repository variables contain only the role ARN and state bucket name; branch restriction and owner approval are enforced by GitHub environment settings, not this OIDC subject.
- Workflow actions are pinned to immutable commit SHAs. Job permissions are minimal; only backend deployment receives OIDC token-write permission, and only Pages publication receives Pages write permission.
- Terraform state is private, encrypted, versioned, and limited to this app's key prefix. The deployment role cannot change the account budget, state bucket, or its own OIDC trust.
- API Gateway throttling and an atomic DynamoDB counter bound request volume. The Lambda uses on-demand concurrency. An account budget sends notifications but does not automatically stop spend.
- Prompts, answers, visitor identifiers, and IP addresses are not persisted. Runtime logs contain request metadata only.
- AWS resource deletion is not part of the deploy workflow. The owner separately authorized retirement of confirmed test/POC resources after the new public assistant is live and dependency checks pass.

## Operational gate

Protect `develop` so changes arrive through pull requests and successful quality checks before merge. Verify the published site's real `/chat` response before retiring old resources. Review budget alerts and request counts during the first month; revisit this design before adding persistent history, S3 ingestion, RAG, or further agent tools.
