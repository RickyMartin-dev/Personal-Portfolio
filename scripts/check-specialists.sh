#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0
for path in agents/README.md agents/roles/ui.md agents/roles/ux.md agents/roles/python.md agents/roles/trading.md prompts/factory.md docs/templates/specialist.md .cursor/commands/specialist.md .claude/commands/specialist.md; do
  if [[ ! -f "$path" ]]; then
    printf 'specialist check missing: %s\n' "$path" >&2
    failures=$((failures + 1))
  fi
done

for path in agents/roles/*.md agents/specialists/*.md; do
  [[ -f "$path" ]] || continue
  for phrase in 'Authority' 'evidence' 'review'; do
    if ! grep -qiF "$phrase" "$path"; then
      printf '%s missing specialist boundary concept: %s\n' "$path" "$phrase" >&2
      failures=$((failures + 1))
    fi
  done
done

if grep -RInE 'auto.?spawn|unrestricted|dangerously-bypass|BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY|git[[:space:]]+push[[:space:]]+--force' agents prompts/factory.md >/dev/null 2>&1; then
  printf 'specialist check found an unsafe authority or credential pattern.\n' >&2
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  printf 'specialist check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'specialist check passed.\n'
