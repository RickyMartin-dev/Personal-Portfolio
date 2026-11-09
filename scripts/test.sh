#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PYTHON="$ROOT_DIR/backend/.venv/bin/python"

if [[ ! -x "$BACKEND_PYTHON" ]]; then
  printf 'Backend environment is missing. Run ./scripts/setup-local.sh first.\n' >&2
  exit 1
fi
if [[ ! -x "$ROOT_DIR/frontend/node_modules/.bin/playwright" ]]; then
  printf 'Frontend dependencies are missing. Run ./scripts/setup-local.sh first.\n' >&2
  exit 1
fi

cd "$ROOT_DIR"
./scripts/project release-check
(cd backend && .venv/bin/python -m pytest tests ../frontend/tests/python)
(cd frontend && npm run test:e2e)

if command -v terraform >/dev/null 2>&1; then
  terraform -chdir=backend/infra/bootstrap fmt -check -recursive
  terraform -chdir=backend/infra/bootstrap init -backend=false -input=false
  terraform -chdir=backend/infra/bootstrap validate
  terraform -chdir=backend/infra/terraform fmt -check -recursive
  terraform -chdir=backend/infra/terraform init -backend=false -input=false
  terraform -chdir=backend/infra/terraform validate
else
  printf 'Terraform checks skipped: Terraform is not installed locally; CI runs both stack validations.\n' >&2
fi

printf '\nLocal verification passed. No AWS inference or deployment was performed.\n'
