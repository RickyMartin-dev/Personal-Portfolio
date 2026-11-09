#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PYTHON="$ROOT_DIR/backend/.venv/bin/python"
CONFIG_FILE="$ROOT_DIR/frontend/assets/js/chatbot.config.js"
CONFIG_BACKUP=''
ORIGINAL_CONFIG=false
LOCAL_CONFIG_WRITTEN=false
API_PID=''
SITE_PID=''

cleanup() {
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "$SITE_PID" ]] && kill "$SITE_PID" 2>/dev/null || true
  [[ -n "$API_PID" ]] && wait "$API_PID" 2>/dev/null || true
  [[ -n "$SITE_PID" ]] && wait "$SITE_PID" 2>/dev/null || true
  if [[ "$LOCAL_CONFIG_WRITTEN" == true ]]; then
    if [[ "$ORIGINAL_CONFIG" == true ]]; then
      mv "$CONFIG_BACKUP" "$CONFIG_FILE"
    else
      rm -f "$CONFIG_FILE"
    fi
  fi
}
trap cleanup EXIT INT TERM

if [[ ! -x "$BACKEND_PYTHON" ]]; then
  printf 'Backend environment is missing. Run:\n  python3 -m venv backend/.venv\n  backend/.venv/bin/pip install -r backend/requirements.txt\n' >&2
  exit 1
fi

cd "$ROOT_DIR"
if [[ -f "$CONFIG_FILE" ]]; then
  CONFIG_BACKUP="$(mktemp "${TMPDIR:-/tmp}/portfolio-chatbot-config.XXXXXX")"
  cp -p "$CONFIG_FILE" "$CONFIG_BACKUP"
  ORIGINAL_CONFIG=true
fi
python3 - "$CONFIG_FILE" <<'PY'
import json
import sys
from pathlib import Path

Path(sys.argv[1]).write_text(
    "window.CHATBOT_CONFIG = "
    + json.dumps({"apiEndpoint": "http://127.0.0.1:8001/chat"})
    + ";\n",
    encoding="utf-8",
)
PY
LOCAL_CONFIG_WRITTEN=true

"$BACKEND_PYTHON" -m uvicorn src.main:app --app-dir "$ROOT_DIR/backend" \
  --reload --host 127.0.0.1 --port 8001 &
API_PID=$!
python3 -m http.server 8000 --bind 127.0.0.1 --directory "$ROOT_DIR/frontend" &
SITE_PID=$!

ready=false
for attempt in {1..30}; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    wait "$API_PID" || true
    printf 'Backend exited before it became ready. Check backend/.env and the startup error above.\n' >&2
    exit 1
  fi
  if curl --silent --fail http://127.0.0.1:8001/health >/dev/null; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  printf 'Backend did not become ready within 30 seconds.\n' >&2
  exit 1
fi

printf 'Portfolio: http://127.0.0.1:8000\nChat API:   http://127.0.0.1:8001/health\nPress Ctrl+C to stop both servers.\n'
wait "$SITE_PID"
