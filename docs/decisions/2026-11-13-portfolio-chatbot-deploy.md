# Portfolio chatbot automated deployment

## Status

Accepted for the V0 portfolio assistant at the owner's request to build and operate the cheapest practical public chatbot. This decision applies only to this repository and deployment.

## Decision

The approved release routing and verification policy is maintained in [delivery architecture](../architecture.md#delivery-and-monitoring). This decision retains the deployment's security boundaries: pull request checks receive no AWS credentials; GitHub Actions uses short-lived OIDC credentials; the protected `aws-production` environment limits deployment to `develop` and requires owner approval; and runtime roles use an IAM permissions boundary.

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
