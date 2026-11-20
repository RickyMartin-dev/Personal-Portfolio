#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  printf 'usage: %s <endpoint-file> <pages-origin>\n' "$0" >&2
  exit 2
fi

endpoint="$(tr -d '\r\n' < "$1")"
origin="$2"
if [[ "$endpoint" != https://*/chat || -z "$origin" ]]; then
  echo "Chatbot endpoint or Pages origin is malformed." >&2
  exit 1
fi

api_base="${endpoint%/chat}"
headers="$(mktemp)"
trap 'rm -f "$headers"' EXIT

health_status="$(curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
  --retry 3 --retry-all-errors --retry-delay 2 \
  --output /dev/null --write-out '%{http_code}' "$api_base/health")"
if [[ "$health_status" != "200" ]]; then
  echo "Chatbot API health route returned HTTP $health_status instead of 200." >&2
  exit 1
fi

preflight_status="$(curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
  --retry 3 --retry-all-errors --retry-delay 2 \
  --request OPTIONS "$endpoint" \
  --header "Origin: $origin" \
  --header "Access-Control-Request-Method: POST" \
  --header "Access-Control-Request-Headers: content-type" \
  --dump-header "$headers" \
  --output /dev/null --write-out '%{http_code}')"
if [[ "$preflight_status" != "204" ]]; then
  echo "Chatbot API CORS preflight returned HTTP $preflight_status instead of 204." >&2
  exit 1
fi

python3 - "$headers" "$origin" <<'PY'
from pathlib import Path
import sys

header_lines = Path(sys.argv[1]).read_text(encoding="utf-8").splitlines()
origin = sys.argv[2]

def last_header(name: str) -> str:
    matches = [
        line.split(":", 1)[1].strip()
        for line in header_lines
        if ":" in line and line.split(":", 1)[0].strip().lower() == name
    ]
    return matches[-1] if matches else ""

if last_header("access-control-allow-origin") != origin:
    raise SystemExit("Chatbot API CORS does not allow the production Pages origin exactly.")
if "POST" not in {value.strip().upper() for value in last_header("access-control-allow-methods").split(",")}:
    raise SystemExit("Chatbot API CORS does not allow POST.")
if "content-type" not in {value.strip().lower() for value in last_header("access-control-allow-headers").split(",")}:
    raise SystemExit("Chatbot API CORS does not allow content-type.")
PY

echo "Production chatbot API health and browser CORS checks passed."
