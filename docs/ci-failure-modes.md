# CI failure modes

The required `merge-gate` accepts a pull request only when every upstream job finishes with `success`. A failed, cancelled, skipped, pending, or neutral result blocks it. Regression cases live in `backend/tests/test_quality_gate.py` and `backend/tests/fixtures/ci-failure-modes.json`.

| Check | What to inspect |
| --- | --- |
| `starter-and-security` | Open the failed Project Starter or secret check step. Correct the reported repository contract, secret, or workflow issue and rerun locally with `./scripts/project release-check`. |
| `security-contract` | Read the security contract assertion in the job log and repair workflow permissions, pinning, or other policy drift. |
| `backend` | Inspect Bandit and pytest output. Download the `bandit-security-results` SARIF artifact for scanner findings; the artifact is retained for seven days. |
| `frontend` | Inspect Playwright browser-test output and the failing page or interaction. Reproduce with the documented frontend test commands. |
| `terraform` | Inspect formatting, initialization, and validation errors for both Terraform roots. Pull requests do not apply infrastructure. |
| `merge-gate` | The gate reports the upstream job and its non-success result. Rerun or fix that job; do not treat skipped or cancelled work as passing. |

For `pending`, wait for the job to finish. For `cancelled` or `skipped`, check workflow conditions and concurrency cancellation before rerunning. When a check has no useful log, use GitHub's rerun action after confirming the workflow configuration and branch are still current.
