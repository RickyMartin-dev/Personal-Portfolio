# Project Commands

## View the site locally

The portfolio is static. Python 3 is the only requirement to serve it; no npm install, backend process, `.env`, or AWS credentials are needed:

```bash
./scripts/dev.sh
# Visit http://127.0.0.1:8000
```

The chatbot shows an under-construction notice and does not send network requests.

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
(cd frontend && npm run test:e2e)
python3 frontend/build.py
```

The static builder copies `frontend/index.html`, pages, styles, scripts, and site images into `frontend/dist/`. It excludes the backend chatbot client/config, Terraform, docs, tests, starter tools, local references, Sass source, and legacy template assets. `WEB3FORMS_KEY` is optional; when missing, the build prints a warning and leaves the contact form unconfigured.

## GitHub Pages deployment

- Pull requests targeting `develop` run Project Starter/security checks, mocked backend and artifact tests, Playwright, and Terraform formatting/validation. These checks do not use AWS credentials or a remote Terraform state.
- A push to `develop` runs the checks needed for the site, builds the static artifact, and publishes it to GitHub Pages with the `github-pages` environment.
- The deploy workflow requires only GitHub Pages permissions. It does not use AWS OIDC, Terraform apply, a Lambda image, or live inference.
- Configure GitHub Pages to use **GitHub Actions**. The `WEB3FORMS_KEY` secret is optional for publishing; without it, only the contact form is disabled.

The GitHub repository currently has `main` as its default and did not have a remote `develop` branch at the last check. Creating/pushing `develop` will start the deployment workflow, so wait until the local changes and GitHub Pages source are ready. The legacy Pages workflow on the remote `main` revision remains a cutover concern; protect `main` from direct pushes until the new path is published and the legacy workflow is removed safely.

## Dormant backend and AWS infrastructure

The `backend/` FastAPI/LangGraph code and Terraform roots are retained for a future chatbot launch, but are not part of the current frontend deployment. Keep the browser notice in place until a separate backend reactivation task confirms the endpoint, secret handling, monitoring, budgets, and cutover. Existing AWS resources were not modified as part of the GitHub Pages work. The historical backend setup and cost assumptions are in [`deployment-and-costs.md`](deployment-and-costs.md).

## Project workflow

```bash
./scripts/project start --task "Describe the task"
./scripts/project finish --summary "Sanitized outcome"
```

Use `.agent-state/second-brain-checkpoint.md` for the active task handoff and keep secrets, customer data, and raw external payloads out of the archive.
