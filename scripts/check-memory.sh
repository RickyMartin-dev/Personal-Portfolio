#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0
for path in docs/operating-system.md docs/automation.md docs/second-brain/README.md docs/compactions/README.md docs/compactions/.gitkeep docs/templates/compaction.md docs/state/handoff.md docs/state/automatic-handoff.md docs/state/current-task.md; do
  if [[ ! -e "$path" ]]; then
    printf 'memory check missing: %s\n' "$path" >&2
    failures=$((failures + 1))
  fi
done

for phrase in 'Compaction protocol' 'Second brain' 'project-local' 'verification'; do
  if ! grep -qiF "$phrase" docs/operating-system.md docs/second-brain/README.md docs/compactions/README.md; then
    printf 'memory check missing concept: %s\n' "$phrase" >&2
    failures=$((failures + 1))
  fi
done

if grep -RInE 'BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}' docs/compactions docs/second-brain agents >/dev/null 2>&1; then
  printf 'memory check found possible credential material.\n' >&2
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  printf 'memory check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'memory check passed.\n'
