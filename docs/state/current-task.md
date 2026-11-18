# Current task: Cross-repository CI/CD and infrastructure

## Objective

Implement the approved develop-branch quality, deployment, and low-cost IaC workflow for Personal-Portfolio and the private Vault Agent Lab.

## Completed locally

### Personal-Portfolio

- Release routing, endpoint protection, and the disabled production chatbot build are implemented; see [delivery architecture](../architecture.md#delivery-and-monitoring) for their current contract.
- The verified Pages artifact is built once and reused. Browser tests are capped at two workers in CI.

### Vault

- The companion private Vault Agent Lab CI/IaC and Cloudflare Pages controls are covered separately by [RickyMartin-dev/Vault PR #7](https://github.com/RickyMartin-dev/Vault/pull/7); this repository change covers the portfolio side.
- GitHub default branch is `develop`. Pull request CI targets `develop`; the release workflow requires an owner-triggered merged PR and deploys only to `vault-vs-lab`.
- Cloudflare Pages dashboard branch controls were saved with production branch `develop`, automatic production deployments disabled, and preview branch deployments disabled. `old-thyme-antiques` was not changed.
- GitHub repository variable `CLOUDFLARE_ACCOUNT_ID` is set. The Cloudflare deploy token secret is still missing.
- Added app build/browser/dependency checks and Vault-only Terraform adoption code. Terraform prevents accidental deletion and leaves Access policies alone until the email allowlist is verified.

## Verification

- Portfolio: Python suite 114 passed; UI suite 10 passed; mocked-chatbot browser suite 3 passed; Project Starter release checks and workflow guard passed; `git diff --check` passed.
- Vault: static build passed; Chromium suite 4 passed; npm audit found 0 vulnerabilities; secret/workflow/instruction/Cloudflare scope checks and Project Starter release checks passed; YAML/HCL parsing and `git diff --check` passed.
- Terraform CLI is unavailable locally. Terraform fmt/init/validate are configured in CI and remain to be confirmed by the PR workflows.

## Remaining owner actions

- Create a Cloudflare Pages-only API token and add it as Vault repository secret `CLOUDFLARE_API_TOKEN`.
- Install Terraform and provide a separate local-only Pages plus Access token; import the existing Pages project and exact Access app, verify the current allowlist, inspect the plan, and apply.
- GitHub Free cannot hard-block required checks on this private repo. Manually confirm both PR workflows pass before merging.
- Review and merge the feature PRs after CI is green. No production deployment has been run from these feature branches.

## Previous completed task

The portfolio's private Agent Lab link was added and deployed through PR #52. PR #53 fixed unique GitHub Pages artifacts for deployment retries. The unrelated Old Thyme project remained untouched.
