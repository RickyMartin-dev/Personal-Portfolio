#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0
for path in docs/upgrades/README.md docs/upgrades/backlog.md docs/templates/upgrade.md; do
  if [[ ! -f "$path" ]]; then
    printf 'upgrade check missing: %s\n' "$path" >&2
    failures=$((failures + 1))
  fi
done

for phrase in 'suggest-upgrades' 'Evidence' 'Rollback' 'trust review'; do
  if ! grep -qiF "$phrase" docs/upgrades/README.md docs/upgrades/backlog.md docs/templates/upgrade.md scripts/project; then
    printf 'upgrade check missing concept: %s\n' "$phrase" >&2
    failures=$((failures + 1))
  fi
done

if grep -RInE 'git[[:space:]]+push[[:space:]]+--force|rm[[:space:]]+-rf[[:space:]]+/' docs/upgrades prompts agents >/dev/null 2>&1; then
  printf 'upgrade check found a high-risk instruction.\n' >&2
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  printf 'upgrade check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'upgrade check passed.\n'
