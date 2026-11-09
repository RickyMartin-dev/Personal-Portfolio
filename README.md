# Personal Portfolio

Static portfolio for Ricky Martin, published with GitHub Pages. The AI chatbot is temporarily disabled and displays an **Under construction** notice. The FastAPI/LangGraph backend and Terraform are retained in the repository for later work, but they are not deployed or called by the site right now.

## Stack

- Static HTML, CSS, JavaScript, and browser tests in `frontend/`.
- A small Python builder creates the Pages artifact at `frontend/dist/` and excludes backend source, local secrets, and Project Starter tooling.
- FastAPI/LangGraph backend and Terraform remain under `backend/`; the Pages workflow does not configure AWS, run Terraform, or invoke a model.
- Project Starter tools and project documentation are kept at the repository root and are not published to Pages.

## Repository map

| Area | Location | Purpose |
| --- | --- | --- |
| Website | `frontend/` | Portfolio pages, styles, browser behavior, static build, and Playwright tests. |
| Future chatbot | `backend/` | FastAPI/LangGraph source, backend tests, Lambda packaging, and Terraform. |
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

Pull requests to `develop` run the Project Starter/security checks, backend mocks, frontend artifact tests, browser tests, and Terraform validation. A push to `develop` verifies the site, builds only the static frontend artifact, and publishes it through the GitHub Pages Actions environment. That workflow does not access AWS, apply Terraform, deploy the backend, or make model requests.

GitHub Pages uses **GitHub Actions** as its build and deployment source. `develop` is the repository default, and pushes to it run the verification, artifact build, and publish workflow. Only `develop` is allowed by the Pages environment. `WEB3FORMS_KEY` is optional; without it the build publishes a direct email link instead of a broken contact form. The historical `static.yml` file remains on `main`, but that workflow is inactive in GitHub Actions.

The backend and AWS setup are intentionally dormant. No AWS CLI login, AWS variables, Terraform state bucket, OIDC role, or AWS deployment is required for current Pages development or deployment. Existing AWS resources have not been changed. See [`docs/architecture.md`](docs/architecture.md) and [`docs/deployment-and-costs.md`](docs/deployment-and-costs.md) for the current boundary and retained backend plan.

## Project Starter

This repository includes Project Starter's portable agent workflow, scripts, checks, prompts, provider adapters, and the Impeccable design skill for Codex, Claude Code, and Cursor. Product-specific design context lives in [`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md). See [`AGENTS.md`](AGENTS.md) and the [`docs/`](docs/) knowledge map.

## Project guides

- [Contribution guidelines](docs/CONTRIBUTING.md)
- [Changelog](docs/CHANGELOG.md)
