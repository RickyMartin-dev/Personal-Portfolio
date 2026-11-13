# Personal Portfolio

Static portfolio for Ricky Martin, published with GitHub Pages. The portfolio assistant is deployed as a compact chat panel with a mobile bottom sheet. Its FastAPI/LangGraph backend runs on AWS Lambda behind API Gateway and calls Amazon Bedrock; the browser never receives provider credentials.

## Stack

- Static HTML, CSS, JavaScript, and browser tests in `frontend/`.
- A small Python builder creates the Pages artifact at `frontend/dist/` and excludes backend source, local secrets, and Project Starter tooling.
- FastAPI/LangGraph backend and Terraform under `backend/`; GitHub Actions deploys the API separately from the Pages artifact.
- Project Starter tools and project documentation are kept at the repository root and are not published to Pages.

## Repository map

| Area | Location | Purpose |
| --- | --- | --- |
| Website | `frontend/` | Portfolio pages, styles, browser behavior, static build, and Playwright tests. |
| Chatbot backend | `backend/` | V0 FastAPI/LangGraph source, backend tests, Lambda packaging, and Terraform. |
| Checks | `frontend/tests/`, `backend/tests/` | UI, API, and Pages artifact verification. |
| Project workflow | `scripts/`, `prompts/`, `agents/`, `docs/` | Local commands, checks, agent guidance, and project knowledge. |
| Local references | `resources/` | Ignored checkouts for migration/reference only; never deployed. |

## Run locally

No dependencies or AWS credentials are needed to view the static site:

```bash
./scripts/dev.sh
# Visit http://127.0.0.1:8000
```

For the full mocked test suite, install Python 3.12, Node.js 22+, npm, and Playwright's Chromium browser, then run:

```bash
./scripts/setup-local.sh
./scripts/test.sh
```

Tests mock provider calls; they do not need AWS credentials or make paid inference requests. The optional Web3Forms contact integration needs the `WEB3FORMS_KEY` GitHub secret at build time. This key is designed to be public in the contact form and is not an AI credential.

## GitHub Pages deployment

Pull requests to `develop` run the Project Starter/security checks, backend mocks, frontend artifact tests, browser tests, and Terraform validation without AWS credentials. A push to `develop` deploys the Lambda image and API through GitHub OIDC, checks `/health`, then builds and publishes the static frontend artifact with the deployed endpoint.

GitHub Pages uses **GitHub Actions** as its build and deployment source. `develop` is the repository default, and pushes to it run verification, backend deployment, artifact build, and publish. Only `develop` is allowed by the Pages environment. `WEB3FORMS_KEY` is optional; without it the build publishes a direct email link instead of a broken contact form. The historical `static.yml` file remains on `main`, but that workflow is inactive in GitHub Actions.

The chatbot V0 uses API Gateway HTTP API, a stateless Lambda/LangGraph runtime, and Amazon Bedrock. The public client receives only the API endpoint; a shared DynamoDB counter caps valid requests at 1,000 per UTC month. Conversation history stays in page memory and logs omit chat content. GitHub Actions deploys with short-lived OIDC credentials after the backend, frontend, and Terraform checks pass. The $5 account-wide AWS budget alerts and OIDC/state bootstrap are configured. See [`docs/architecture.md`](docs/architecture.md), [`docs/deployment-and-costs.md`](docs/deployment-and-costs.md), and [`docs/future-rag-plan.md`](docs/future-rag-plan.md).

## Project Starter

This repository includes Project Starter's portable agent workflow, scripts, checks, prompts, provider adapters, and the Impeccable design skill for Codex, Claude Code, and Cursor. Product-specific design context lives in [`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md). See [`AGENTS.md`](AGENTS.md) and the [`docs/`](docs/) knowledge map.

## Project guides

- [Contribution guidelines](docs/CONTRIBUTING.md)
- [Changelog](docs/CHANGELOG.md)
