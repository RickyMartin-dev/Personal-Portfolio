# Current task: Portfolio RAG and weekly usage report

## Current release state

- PR #31 (`codex/weekly-usage-report-owner-gate`) contains the S3-backed RAG index, curated agent facts, temporary browser history, S3 change-triggered reindexing, and Monday usage/cost report. It remains open and is not deployed.
- The S3 document bucket and RAG index are created by the PR's Terraform apply. They remain empty until the deployment is approved and documents are uploaded.
- The shared local checkout now tracks `codex/weekly-usage-report-owner-gate`; a stash preserves preexisting uncommitted notes and local state from the prior `develop` checkout.
- ECC's latest PR audit passed its workflow config and harness checks. Bandit scans backend Python in CI, focused agent security/deployment regressions run explicitly, and synthetic RAG retrieval reference cases cover ranked source behavior.

## Owner account settings completed

- GitHub environment `aws-production` permits deployments only from `develop`.
- `RickyMartin-dev` is the required deployment reviewer; self-review is allowed so the owner can approve their own run. Administrator bypass is disabled.
- The `WEEKLY_REPORT_EMAIL` environment secret is configured. Its value is intentionally not recorded here.
- Existing `develop` branch protection requires pull requests, all five CI checks, up-to-date branches, and resolved conversations; bypass is disabled, force pushes and deletion are blocked.
- The active `Owner-only develop updates` ruleset now targets only `develop`; `RickyMartin-dev` is its only bypass actor, and updates/deletions are restricted with force pushes blocked.

## Remaining owner setup

1. Merge PR #31 after its checks pass and approve the `aws-production` deployment.
2. Confirm the SNS email subscription from the inbox after first deployment.
3. Upload approved portfolio documents to Terraform output `rag_documents_s3_uri`; creates, replacements, and deletions under the monitored `documents/` prefix trigger index sync.

## Verification

- Full backend/Python frontend suite: 50 passed. Bandit 1.9.4 scanned `backend/src` with no findings; workflow validation and `git diff --check` passed.
- Bootstrap Terraform update applied: 0 added, 2 changed, 0 destroyed. The deploy role now trusts the protected `aws-production` environment and permits the narrowly scoped RAG/report deployment resources.
- Current-commit GitHub CI and ECC follow-up remain to be checked after pushing the latest scanner and retrieval-reference changes.
- No application AWS resources for the RAG index or weekly report have been deployed. The $5 account budget alert remains a notification, not a spend limit.
