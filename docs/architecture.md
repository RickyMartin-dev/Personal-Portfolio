# Architecture

## Active runtime

```text
Visitor browser
  └── Static portfolio pages, styles, and scripts
        └── GitHub Pages

Chatbot launcher
  └── Accessible “Under construction” notice
        └── No API request is made
```

The site source, browser tests, and static build live in `frontend/`. The site is the v0 "Aurora Lines" design (home, About, Games; plain HTML/CSS/JS, fonts from Google Fonts, theme follows the OS); `design-showcase/aurora-final/` and `studio/` are its design source. `frontend/build.py` publishes only the static site files into `frontend/dist/`; backend source, Terraform, test tooling, and Project Starter files are excluded. The site needs no backend process or AWS account access to run locally.

## Temporarily inactive chatbot backend

`backend/` retains the FastAPI/LangGraph API, tests, Lambda packaging, and Terraform for future work. The portfolio does not load the chat client or configuration and does not expose an API endpoint. The Pages deployment workflow does not build or deploy this backend, configure AWS credentials, run Terraform, or call a model.

When the backend is reactivated in a separate reviewed task, the intended request path is API Gateway HTTP API → Lambda container → Bedrock. The browser should continue to send no provider credential; inference credentials belong in the backend environment. Monitoring, usage limits, and cost controls must be confirmed before publishing a callable endpoint.

## GitHub Actions and branch flow

- Feature branches open pull requests to `develop`.
- Pull requests run Project Starter/security checks, mocked backend and artifact tests, Playwright browser tests, and Terraform format/validation. These checks use no AWS credentials or remote Terraform state.
- Pushes to `develop` run verification, build `frontend/dist/`, and publish that artifact through the `github-pages` environment.
- `.github/workflows/deploy.yml` grants Pages deployment permissions only. AWS OIDC, Terraform apply, Lambda image publishing, and live inference are not part of the active flow.
- At the last repository check, GitHub's default branch was `main` and no remote `develop` branch existed. The remote `main` revision still had the legacy Pages workflow. Keep `main` unchanged during cutover until the Pages source and new `develop` deployment path are ready, then retire that old workflow through the chosen branch process.

## Trust and cost boundaries

- Published JavaScript and HTML are public. Never put AI provider credentials in them.
- The active chatbot notice sends no message text, analytics, or API request.
- The contact form uses Web3Forms. Its optional access key is a public client-side form identifier, not an AI secret.
- Existing AWS resources remain untouched. The future infrastructure design and prior cost notes are documented in [`deployment-and-costs.md`](deployment-and-costs.md); those estimates do not describe a newly deployed backend in this branch.
