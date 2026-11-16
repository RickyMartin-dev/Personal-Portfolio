# Contributing

Contributions should improve the portfolio site, chatbot backend, deployment workflow, or maintainability of its embedded Project Starter tools.

## Branch and deployment flow

1. Create a short lived branch from `develop`, using a name such as `feat/chatbot-history`, `fix/contact-form`, or `chore/ci-policy`.
2. Push the branch and open a pull request with base `develop`. Do not push directly to `develop`.
3. Wait for the required `Quality checks / merge-gate` check. It passes only when starter/security checks, backend tests, frontend browser tests, and both Terraform validations pass.
4. Merge the pull request into `develop` after the gate passes. A push to `develop` starts the production workflow: it verifies the commit again, deploys the Lambda/API with GitHub OIDC, checks the API health route, builds the Pages site with the deployed endpoint, and publishes Pages.

In GitHub settings, verify or update the existing `develop` branch rule to require pull requests and the `Quality checks / merge-gate` status, block force pushes and branch deletion, and apply the rules to repository administrators. This repository is maintained by one owner, so do not require an approval count that the owner cannot satisfy; the passing CI gate is the merge requirement. The Actions workflows cannot enforce these repository settings by themselves.

## Before opening a change

1. Read `../AGENTS.md`, `architecture.md`, and `security.md`.
2. Explain the problem and the smallest useful change.
3. Keep tool-specific adapters thin and point them to shared sources.
4. From the repository root, run `./scripts/project check` and review `git diff --check`.
5. Update research or decision notes when the change is based on a new external convention.

Avoid committing credentials, machine-specific state, generated transcripts, or assumptions about a user's runtime. Keep Markdown lines readable and link detailed guidance instead of growing the root instruction file.
