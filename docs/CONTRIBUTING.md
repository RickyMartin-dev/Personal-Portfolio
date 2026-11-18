# Contributing

Contributions should improve the portfolio site, chatbot backend, deployment workflow, or maintainability of its embedded Project Starter tools.

## Branch and deployment flow

1. Create a short lived branch from `develop`, using a name such as `feat/chatbot-history`, `fix/contact-form`, or `chore/ci-policy`.
2. Push the branch and open a pull request with base `develop`. Do not push directly to `develop`.
3. Wait for the required `Quality checks / merge-gate` check. It passes only when starter/security checks, backend tests, frontend browser tests, and both Terraform validations pass.
4. Merge the pull request into `develop` after the gate passes. The production workflow verifies the commit and compares it with the latest successful release. Backend runtime and application Terraform changes wait for the owner in `aws-production`, deploy the Lambda/API with GitHub OIDC, and check the API health route. Frontend changes publish the static site; when both areas changed, publication waits for backend health. Docs/tests-only changes do not publish. Bootstrap Terraform is validated but remains an owner-run operation.

If a required check is pending or fails, do not merge; use [CI failure modes](ci-failure-modes.md) to identify the relevant job and diagnostics.

In GitHub settings, verify or update the existing `develop` branch rule to require pull requests and the `Quality checks / merge-gate` status, block force pushes and branch deletion, and apply the rules to repository administrators. Restrict branch updates to the owner through a ruleset bypass list. Configure `aws-production` to allow only `develop` and require Ricky Martin's approval. The AWS role trust accepts the exact repository/environment subject; the workflow itself deploys only from `develop`, so the environment branch restriction and reviewer are essential external controls. These repository settings cannot be enforced by workflow YAML alone.

## Before opening a change

1. Read `../AGENTS.md`, `architecture.md`, and `security.md`.
2. Explain the problem and the smallest useful change.
3. Keep tool-specific adapters thin and point them to shared sources.
4. From the repository root, run `./scripts/project check` and review `git diff --check`.
5. Update research or decision notes when the change is based on a new external convention.

Avoid committing credentials, machine-specific state, generated transcripts, or assumptions about a user's runtime. Keep Markdown lines readable and link detailed guidance instead of growing the root instruction file.
