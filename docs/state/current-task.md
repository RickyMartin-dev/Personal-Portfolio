# Current task: security update and mobile experience

## Current checkout

- Local branch: `feature/security_update`, based on `0b627020b9593c974d7c3b85d24386ed2ab312bd`.
- The working tree includes a retry-safe ECR image publish fix and a narrow IAM tag permission fix (SNS tag reads for the report topic; tag read and write scoped to the RAG source bucket) from investigation of failed AWS workflow run `43968012495`.
- The homepage now displays all four experience-in-numbers labels and descriptions at phone widths, and the three page headers use a compact accessible menu button at phone widths.
- UI test run: `cd frontend && npm run test:e2e` — 9 passed; experience copy checked at 320px, 390px, 600px, and 640px; screenshot reviewed at 390px. `git diff --check` passed.
- The requested changes are being prepared for a pull request; no changes have been merged or deployed.

## Remaining work

1. Continue the previously requested security assessment on `feature/security_update`; the mobile UI implementation does not complete that broader review.
2. Review all local changes together, including the inherited AWS workflow changes, through the no-mistakes review/test/CI gate before merge.
3. Complete the earlier requested repository-wide security review; this mobile UI change does not complete that audit.
4. Verify current GitHub/AWS state before relying on the older RAG deployment notes below.

The repository `start`/`finish` wrappers stalled during the full `scripts/check-starter.sh` credential scan; a sanitized task snapshot was saved directly to the archive. Investigate the scan runtime separately.

## Earlier RAG and weekly-report handoff (verify before acting)

The prior handoff said PR #31 (`codex/weekly-usage-report-owner-gate`) held the S3-backed RAG index, curated agent facts, temporary browser history, S3 change-triggered reindexing, and Monday usage/cost report; it was open and not deployed at that handoff. It also said an account-wide $5 budget alert was configured as a notification, not a spend limit, `aws-production` required owner approval, and `develop` was protected. These are historical claims from the earlier task and must be checked against current GitHub/AWS state before use.
