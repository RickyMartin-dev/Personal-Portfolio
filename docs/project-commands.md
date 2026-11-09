# Project Commands

## Environment

- Required: Python 3.12, Node.js 22+, npm, Git, Docker for Lambda image builds, Terraform 1.10+, and a native AWS CLI v2 for AWS access.
- Local inference: AWS profile or Bedrock API key with access to the configured model and Guardrails API.
- Chat messages stay in browser memory and are sent as bounded context. Reloading the page clears the conversation.
- `backend/.env` is local-only and ignored. Copy `backend/.env.example`; never paste credentials into GitHub issues or commit them.

## Local development

```bash
./scripts/project start --task "Describe the task"
./scripts/setup-local.sh
./scripts/dev.sh
```

Configure `BEDROCK_REGION`, `BEDROCK_MODEL_ID`, and either `AWS_BEARER_TOKEN_BEDROCK` or `AWS_PROFILE` in `backend/.env`. The website is at `http://127.0.0.1:8000`; the chatbot API is at `http://127.0.0.1:8001/chat`. The dev script temporarily points the browser at the local API and restores any pre-existing local chatbot config when stopped. A real local request calls Bedrock and incurs inference and Guardrails usage charges.

## Quality checks

```bash
# Project Starter contract and hardening checks
./scripts/project check
./scripts/project release-check

# Full local suite: release checks, Python API/artifact tests, Playwright, and Terraform when installed
./scripts/test.sh

# Or run each suite separately
(cd backend && .venv/bin/python -m pytest tests ../frontend/tests/python)
(cd frontend && npm run test:e2e)

# Terraform syntax and validation
terraform -chdir=backend/infra/terraform fmt -check -recursive
terraform -chdir=backend/infra/terraform init -backend=false
terraform -chdir=backend/infra/terraform validate
```

The Python suite covers request validation, CORS, guardrail fail-closed behavior, logging privacy, static artifact builds, and the Lambda Docker context boundary. The artifact tests verify runtime configuration escaping and exclude backend, infrastructure, legacy assets, and repository tooling. Playwright covers keyboard access, bounded chat history, rate limits, retry/error states, mobile layout, and the absence of browser-side AI credentials. CI runs these checks and validates both Terraform stacks; it does not apply infrastructure on pull requests.

CI uses mocks for unit/browser tests and makes one real inference smoke request after a production deployment. Each successful deploy therefore incurs one model and Guardrails request.

## Design workflow

The Impeccable skill is installed for Codex, Claude Code, and Cursor. Visual work should use the product context in `PRODUCT.md` and `DESIGN.md`; `.lavish/theme.css` styles documentation and review artifacts only. Claude and Cursor hooks run after supported edits; Codex requires approving the project hook in `/hooks`. To run the detector manually:

```bash
sh .agents/skills/impeccable/scripts/impeccable detect --json frontend/assets/css frontend/assets/js frontend/pages
```

The first detector run may download its checksum-verified engine into the user cache. Refresh provider copies during a deliberate tool update with `npx impeccable update`.

## First-time AWS and GitHub setup

1. Install an AWS CLI v2 build compatible with Apple Silicon and verify the intended profile with `aws sts get-caller-identity`.
2. Confirm access to the active Claude Haiku model and Bedrock Guardrails in the selected region.
3. Run the one-time bootstrap in `backend/infra/bootstrap` using the local AWS profile. It creates the Terraform state bucket and GitHub OIDC deployment role scoped to this repository and `develop`.
4. Configure repository variables for AWS region, deployment role ARN, and Terraform state bucket. Keep `WEB3FORMS_KEY` only for the contact form; do not configure or publish a chatbot API key.
5. Create/protect `develop`, set GitHub Pages to GitHub Actions, and require CI checks for pull requests targeting `develop`.
6. Inventory existing API Gateway, Lambda, ECR, IAM, S3, and CloudWatch resources. The read-only inventory is recorded in [`legacy-chatbot-cutover.md`](legacy-chatbot-cutover.md); do not remove anything until the new endpoint is live and the owner has reviewed the exact cleanup list.

## Deploy behavior

- Pull requests to `develop`: Project Starter checks, backend mocks, Playwright, secret scanning, and Terraform format/validation. No AWS plan or credentials are used on pull requests.
- Pushes to `develop`: create the ECR image, apply Terraform, publish only the frontend artifact, and run a real chat smoke test.
- `main`: protect it from direct pushes. The new workflow has no `main` trigger, though the current remote `main` still contains the old Pages workflow until its deletion is merged there.

The deploy workflow expects the bootstrap variables above. It uses GitHub OIDC instead of long-lived AWS keys. The Lambda role authorizes Bedrock; the website bundle contains only the API endpoint. `backend/infra/terraform/README.md` documents first-apply ordering and CloudWatch Logs Insights queries. See `docs/deployment-and-costs.md` for the cost model and `docs/legacy-chatbot-cutover.md` before removing any old resource.

## Durable project workflow

```bash
./scripts/project plan <slug> "<title>"
./scripts/project finish --summary "<sanitized outcome>"
```

At task completion, set `PROJECT_SNAPSHOT_ARCHIVE_ROOT=/Users/ricky/Documents/Assistant/Ricky-Brain` and `PROJECT_SNAPSHOT_AGENT=codex` when running `finish`. Keep `.agent-state/second-brain-checkpoint.md` current at meaningful milestones.

## Learning and retrospective workflow

Record a sanitized problem or correction at finish, group repeated areas into a proposal, and generate a monthly review from repository evidence:

```bash
./scripts/project finish --summary "<outcome>" --friction "area|symptom|cause|fix"
./scripts/project learn [--json]
./scripts/project retro [YYYY-MM] --html
```

Approved lessons belong in `docs/lessons.md` with an enforcing check or a short reason one is not feasible. Retrospectives list follow-up candidates; they do not delete, move, or alter AWS resources.
