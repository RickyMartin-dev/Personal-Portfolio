#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8000}"

printf 'Serving the static portfolio at http://127.0.0.1:%s\n' "$PORT"
printf 'The chatbot is marked under construction. Press Ctrl+C to stop.\n'
exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT_DIR/frontend"
