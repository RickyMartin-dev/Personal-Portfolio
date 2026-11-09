#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  printf 'Python 3.12 was not found. Install it or set PYTHON to its executable.\n' >&2
  exit 1
fi

python_version="$($PYTHON_BIN -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')"
if [[ "$python_version" != '3.12' ]]; then
  printf 'This backend targets Python 3.12; %s is %s. Try: PYTHON=python3.12 ./scripts/setup-local.sh\n' \
    "$PYTHON_BIN" "$python_version" >&2
  exit 1
fi

cd "$ROOT_DIR"
if [[ ! -d backend/.venv ]]; then
  "$PYTHON_BIN" -m venv backend/.venv
fi
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt

if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
  printf 'Created backend/.env from the safe example. Add a local Bedrock API key or AWS profile before live inference.\n'
fi

npm ci --prefix "$ROOT_DIR/frontend"
npx --prefix "$ROOT_DIR/frontend" playwright install chromium

printf '\nLocal setup is ready. Run ./scripts/dev.sh, then visit http://127.0.0.1:8000.\n'
