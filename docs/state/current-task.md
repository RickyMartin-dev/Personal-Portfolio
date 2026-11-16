# Current task: Portfolio RAG and weekly usage report

## Current release state

- PR #31 (`codex/weekly-usage-report-owner-gate`) contains the S3-backed RAG index, curated agent facts, temporary browser history, S3 change-triggered reindexing, and Monday usage/cost report. It remains open and is not deployed.
- The S3 document bucket and RAG index are created by the PR's Terraform apply. They remain empty until the deployment is approved and documents are uploaded.
- The shared local checkout now tracks `codex/weekly-usage-report-owner-gate`; a stash preserves preexisting uncommitted notes and local state from the prior `develop` checkout.
- ECC's latest PR audit passed its security-evidence, workflow-config, and harness checks. Bandit scans backend Python in CI and uploads a seven-day SARIF artifact, focused agent security/deployment regressions run explicitly, synthetic RAG retrieval reference cases cover ranked source behavior, and tests plus a runbook cover fail-closed CI status handling.

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

- Full backend/Python frontend suite: 56 passed. Bandit 1.9.4 scanned `backend/src` with no findings and generated SARIF; workflow validation and `git diff --check` passed. CI failure-mode runbook: [`ci-failure-modes.md`](../ci-failure-modes.md).
- Bootstrap Terraform update applied: 0 added, 2 changed, 0 destroyed. The deploy role now trusts the protected `aws-production` environment and permits the narrowly scoped RAG/report deployment resources.
- Latest GitHub CI passed all six required checks. ECC security-evidence, config, and harness audits passed; remaining readiness/taxonomy notes are neutral repository-wide recommendations.
- No application AWS resources for the RAG index or weekly report have been deployed. The $5 account budget alert remains a notification, not a spend limit.
