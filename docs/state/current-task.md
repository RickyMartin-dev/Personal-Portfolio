# Current task: restore the develop deployment

## Current checkout

- Local branch: `fix/deploy-role-event-source-tags`, based on merged `develop` commit `3d9a83b`.
- PR #34 repaired Lambda version discovery and RAG bucket encryption permissions; all six required checks passed and it was squash-merged.
- PR #35 repaired Lambda code-signing-config and Bedrock KB tag-read permissions; all six required checks passed and it was squash-merged.
- Deployment run `43995899709` passed verification and its Terraform plan was reviewed (6 adds, 1 change, 2 tainted Lambda replacements). The protected stage was approved. Apply created the RAG encryption config and weekly report schedule, recreated weekly-report and reindex Lambdas, updated chatbot Lambda, then failed creating the SQS event source mapping because the deploy role lacked `lambda:TagResource`. Pages publish was skipped.
- PR #36 adds tag/untag permissions for event-source mappings, scoped to the Lambda event-source-mapping ARN pattern. Regression tests cover exact resources. Targeted tests (27 passed), Terraform fmt/validation, and `git diff --check` passed locally.

## Remaining work

1. Open PR #36, wait for all required checks, and merge only when green.
2. Update the live deploy role to match the merged mapping tag permissions, preserving unrelated statements.
3. Generate a fresh Terraform plan from the partially applied remote state; review creates/replacements before the protected approval.
4. Continue the deployment loop until Terraform apply, API health, and Pages publish succeed.
5. Verify the weekly scheduler, RAG S3 event-to-index path, and SNS subscription confirmation. Report any remaining owner action.

## Governance and limits

- Production deploys run only from `develop` and require `aws-production` approval. The user explicitly authorized normal PR merges and deployment approvals; do not bypass checks or protections.
- Prior applies are partial. Preserve the existing RAG bucket and weekly-report topic; inspect every fresh plan before approval.
- The weekly-report SNS subscription was last observed pending confirmation; do not call report delivery active until confirmed.
