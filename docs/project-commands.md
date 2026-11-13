# Project Commands

## View the site locally

The portfolio is static. Python 3 is the only requirement to serve it; no npm install, backend process, `.env`, or AWS credentials are needed:

```bash
./scripts/dev.sh
# Visit http://127.0.0.1:8000
```

Without `CHATBOT_API_ENDPOINT`, the chatbot shows an under-construction notice and sends no network requests. To preview the active client, build with a test HTTPS `/chat` endpoint and mock its responses in Playwright.

## Install tools for the full test suite

The test suite checks the FastAPI source with mocked AWS clients, builds the static Pages artifact, and runs Playwright browser tests. It does not call AWS or require credentials.

```bash
./scripts/setup-local.sh
./scripts/test.sh
```

Requirements: Python 3.12, Node.js 22+, npm, and the Chromium browser downloaded by Playwright. Terraform validation runs when Terraform 1.10+ is installed; GitHub Actions validates both Terraform roots on pull requests. Docker and AWS CLI are not required for these checks.

Run a suite individually:

```bash
(cd backend && .venv/bin/python -m pytest tests ../frontend/tests/python)
(cd frontend && npm run test:e2e && npm run test:e2e:chatbot)
python3 frontend/build.py
```

The static builder copies `frontend/index.html`, pages, styles, scripts, and site images into `frontend/dist/`. It excludes Terraform, docs, tests, starter tools, and local references. With no `CHATBOT_API_ENDPOINT`, it omits the chat client/config and keeps the notice. Set a validated HTTPS `/chat` URL to generate the public client config and add its origin to the page CSP. The contact form uses the built-in public Web3Forms key; set `WEB3FORMS_KEY` to override it or to `off` for a direct email link.

## GitHub Pages deployment

- Pull requests targeting `develop` run Project Starter/security checks, mocked backend and artifact tests, Playwright, and Terraform formatting/validation. These checks do not use AWS credentials or a remote Terraform state.
- A push to `develop` runs the mocked API/UI tests and Terraform validation, then deploys the Lambda image and API with GitHub OIDC. The workflow checks `/health` and publishes Pages with the resulting endpoint.
- AWS credentials are short-lived OIDC sessions; `AWS_ROLE_ARN` and `TF_STATE_BUCKET` are non-secret repository variables. No static AWS keys are stored in GitHub.
- Configure GitHub Pages to use **GitHub Actions**. The contact form works without any secret: the build uses the public Web3Forms key in `frontend/build.py`. An optional `WEB3FORMS_KEY` secret overrides it, and `off` switches to the direct email link.

The GitHub repository default is `develop`, and the `github-pages` environment permits only that branch. Push changes for this site to `develop`; its workflow runs verification and publishes the built frontend. A historical Pages workflow file remains on `main`, but GitHub Actions marks it inactive and the environment blocks main-branch deployment.

## Backend and AWS infrastructure

The `backend/` FastAPI/LangGraph code and Terraform roots deploy the V0 assistant. The stack uses a $5 account-wide budget alert, 1,000-request monthly quota, and limited logs. The website never receives provider credentials. See [`deployment-and-costs.md`](deployment-and-costs.md) for cost and cutover steps, and [`future-rag-plan.md`](future-rag-plan.md) for future S3 ingestion.

## Project workflow

```bash
./scripts/project start --task "Describe the task"
./scripts/project finish --summary "Sanitized outcome"
```

Use `.agent-state/second-brain-checkpoint.md` for the active task handoff and keep secrets, customer data, and raw external payloads out of the archive.
