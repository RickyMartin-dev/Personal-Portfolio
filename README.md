# Personal Portfolio

Portfolio website for Ricky Martin, with a public AI chatbot backed by AWS Bedrock.

## Stack

- Static HTML, CSS, JavaScript, Playwright tests, and GitHub Pages builder in `frontend/`.
- FastAPI and LangGraph chatbot, Python tests, Docker image, Terraform, and AWS smoke check in `backend/`.
- Project Starter tools, agent guidance, and durable project docs are adopted at the repository root.
- Production deploys from `develop` to GitHub Pages and AWS. The new workflow has no `main` trigger; the current remote `main` still contains its legacy Pages workflow until its deletion is merged there.

## Repository map

| Area | Location | Purpose |
| --- | --- | --- |
| Website | `frontend/` | Static portfolio, browser chatbot widget, Playwright suite, and Pages build. |
| Chatbot | `backend/` | FastAPI/LangGraph API, Bedrock client, Python suite, and Lambda image. |
| AWS | `backend/infra/` | One-time CI/state bootstrap and application infrastructure. |
| Checks | `frontend/tests/`, `backend/tests/` | UI, API, and container-boundary verification. |
| Project workflow | `scripts/`, `prompts/`, `agents/`, `docs/` | Local setup, checks, agent guidance, and project knowledge. |
| Tool configuration | `.github/`, `.githooks/`, `.agentic/`, `.agents/`, `.claude/`, `.codex/`, `.cursor/`, `.impeccable/`, `.lavish/` | CI, coding-agent adapters, design tools, and review pages; these are not runtime packages. |
| Local references | `resources/` | Ignored checkouts for migration/reference only; never deployed. |

## Local setup

```bash
./scripts/project start --task "Local setup"
./scripts/setup-local.sh
```

The setup script requires Python 3.12 and Node.js 22 or newer. Set `BEDROCK_REGION`, `BEDROCK_MODEL_ID`, and either `AWS_PROFILE` or a local `AWS_BEARER_TOKEN_BEDROCK` value in the ignored `backend/.env`. Do not put AI credentials in website JavaScript. Local backend and frontend instructions are in [`docs/project-commands.md`](docs/project-commands.md).

## Run and verify

```bash
./scripts/dev.sh
```

Visit `http://127.0.0.1:8000`; the API runs at `http://127.0.0.1:8001`. Local chat calls the same Bedrock model as Lambda. Real local inference incurs Bedrock and Guardrails usage charges. Run `./scripts/test.sh` for the local suite. Browser and backend tests mock AWS; the deploy workflow runs one real inference smoke request after updating the backend.

## Deploy

Pull requests targeting `develop` run starter/security checks, frontend and backend tests, secret scanning, and Terraform validation without AWS permissions. A push to `develop` repeats verification, deploys the backend with GitHub OIDC, checks a real model response, then publishes only the built frontend directory to GitHub Pages. Protect `main` from direct pushes during cutover; its current remote revision still contains the old Pages workflow until the deletion is merged there.

Before the first deploy, complete the steps in [`docs/project-commands.md`](docs/project-commands.md#first-time-aws-and-github-setup), including a compatible AWS CLI, state bucket, OIDC role, Bedrock model access, and repository variables. Review the AWS inventory before retiring the old chatbot resources.

See [`docs/deployment-and-costs.md`](docs/deployment-and-costs.md) for the architecture, required setup, AWS costs, monitoring, and cutover steps. The old backend source is documented in [`docs/legacy-chatbot-cutover.md`](docs/legacy-chatbot-cutover.md); old AWS resources remain untouched until the new endpoint is live and cleanup is reviewed.

## Project Starter

This repository includes Project Starter's portable agent workflow, scripts, checks, prompts, provider adapters, and the Impeccable design skill for Codex, Claude Code, and Cursor. Product-specific design context lives in [`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md). See [`AGENTS.md`](AGENTS.md) and the [`docs/`](docs/) knowledge map.

## Project guides

- [Contribution guidelines](docs/CONTRIBUTING.md)
- [Changelog](docs/CHANGELOG.md)
