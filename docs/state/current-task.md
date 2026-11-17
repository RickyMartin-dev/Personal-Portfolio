# Current task: restore the develop deployment

## Current checkout

- Local branch: `fix/deploy-role-refresh-permissions`, based on the merged `develop` tip `95236d7`.
- PR #34 repaired deployment-role permissions for Lambda version discovery and RAG bucket encryption; all six required checks passed and it was squash-merged.
- Deployment run `43993760195` passed verification but failed Terraform refresh: the deploy role lacked Lambda code-signing-config reads and Bedrock KB tag reads. The existing AWS deployment role was updated to match merged PR #34 while preserving its other statements.
- PR #35 adds those two missing grants, scoped to the three managed Lambda functions and the portfolio knowledge base, with semantic regression checks. Targeted tests (25), bootstrap Terraform validation, formatting, and local commit/release hooks passed. Five GitHub checks are pending.

## Remaining work

1. Wait for PR #35 required checks; fix any failure and merge only after all required gates pass.
2. Update the live GitHub deploy role to match the merged bootstrap Terraform additions, preserving every unrelated statement.
3. Monitor the next `develop` deployment. Review the failure details and repeat the PR-gated repair loop as needed.
4. Confirm Terraform completion, API health, GitHub Pages publication, weekly scheduler, and RAG S3 event-to-index path.
5. Report any remaining owner action, including confirmation of the SNS email subscription if it remains pending.

## Governance and limits

- Deployments run only from `develop` and require the `aws-production` environment approval. The user explicitly authorized PR merges and deployment approvals; do not bypass checks or protections.
- Earlier deployment attempts partially applied infrastructure. Inspect current state and planned changes before each approval; avoid replacing user documents or removing the existing RAG bucket/topic.
- SNS weekly-report email subscription was last observed pending confirmation; confirm its status before calling reports active.
