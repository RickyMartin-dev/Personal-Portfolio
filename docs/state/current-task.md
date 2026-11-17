# Current task: restore the develop deployment

## Current checkout

- Local branch: `fix/deploy-role-event-source-tag-reads`, based on merged `develop` commit `4deb6a6`.
- PRs #34–#36 each passed all six required checks and were squash-merged through the protected PR path.
- Deployment run `43997474526` passed verification and was owner-approved after a read-only plan (1 event mapping add, 1 Lambda update, 0 destroys). The apply updated the chatbot image and created the SQS event-source mapping, then Terraform failed its post-create tag read because the deploy role lacked `lambda:ListTags`. AWS confirms the mapping is enabled and Terraform state contains it. Pages publish was skipped.
- The live deploy role now scopes mapping `TagResource`/`UntagResource` to the Lambda event-source-mapping ARN pattern. The weekly schedule is enabled Mondays at 8 AM Eastern, the RAG bucket is AES256 encrypted, and the weekly email SNS subscription is confirmed.
- PR #37 adds `lambda:ListTags` to the same scoped event-mapping permission statement and regression checks. Targeted deployment-contract tests (28 passed), Terraform fmt/validation, and `git diff --check` passed locally.

## Remaining work

1. Open PR #37, wait for every required check, and merge only when green.
2. Update the live deploy role to include the new scoped `lambda:ListTags` action, preserving unrelated statements.
3. Re-plan from current remote state; expected change is only the chatbot image tag, with no destroys. Approve only after reviewing the fresh plan.
4. Verify Terraform apply, API health, and GitHub Pages publication. Inspect RAG upload-to-index behavior and the weekly schedule.
5. Confirm there are no outstanding owner steps; then save the required sanitized project archive.

## Governance and limits

- Deployments run only from `develop` and require `aws-production` approval. The user explicitly authorized normal PR merges and deployment approvals; do not bypass checks or protections.
- Prior applies are partial. Preserve the RAG bucket and weekly-report topic, and inspect each fresh plan before approval.
