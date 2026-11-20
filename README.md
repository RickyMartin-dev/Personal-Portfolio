# Personal Portfolio

Static portfolio for Ricky Martin, published with GitHub Pages. The chatbot API runs on AWS Lambda behind API Gateway and calls Amazon Bedrock. Production Pages enables the public chatbot from its reviewed endpoint; local builds without `CHATBOT_API_ENDPOINT` keep the under-construction notice. See [chatbot experience](docs/chatbot-experience.md) for interaction details.

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

Tests mock provider calls; they do not need AWS credentials or make paid inference requests. Contact-form build options are documented in [project commands](docs/project-commands.md#github-pages-deployment).

## GitHub Pages deployment

GitHub Actions publishes the verified Pages artifact from `develop`. Backend deployment uses the owner-approved `aws-production` environment. See [delivery architecture](docs/architecture.md#delivery-and-monitoring) for release routing and [project commands](docs/project-commands.md#github-pages-deployment) for repository setup.

GitHub Pages uses **GitHub Actions** as its build and deployment source. See [delivery architecture](docs/architecture.md#delivery-and-monitoring) for the production chatbot endpoint and publish checks. Contact-form fallback and override behavior, along with repository settings, are documented in [project commands](docs/project-commands.md#github-pages-deployment). The historical `static.yml` file remains on `main`, but that workflow is inactive in GitHub Actions.

The backend's runtime, privacy, retrieval, and operating-cost details are documented in [architecture](docs/architecture.md), [deployment and costs](docs/deployment-and-costs.md), and the [RAG operations guide](docs/future-rag-plan.md).

## Project Starter

This repository includes Project Starter's portable agent workflow, scripts, checks, prompts, provider adapters, and the Impeccable design skill for Codex, Claude Code, and Cursor. Product-specific design context lives in [`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md). See [`AGENTS.md`](AGENTS.md) and the [`docs/`](docs/) knowledge map.

## Project guides

- [Contribution guidelines](docs/CONTRIBUTING.md)
- [Changelog](docs/CHANGELOG.md)
