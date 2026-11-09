#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0
for path in docs/research/README.md docs/research/2026-09-project-operating-system-research.md docs/research/2026-09-luna-operating-system-ecosystems.md docs/research/2026-09-luna-operating-system-governance.md docs/research/2026-09-luna-operating-system-operations.md docs/research/2026-10-24-update-project-logic.md; do
  if [[ ! -f "$path" ]]; then
    printf 'research check missing: %s\n' "$path" >&2
    failures=$((failures + 1))
  fi
done

if (( $(find docs/research -maxdepth 1 -type f -name '2026-09-luna-operating-system-*.md' -print | wc -l | tr -d ' ') < 3 )); then
  printf 'research check requires three independent Luna operating-system reports.\n' >&2
  failures=$((failures + 1))
fi

for phrase in 'Sources' 'Checked:' 'Recheck' 'Comparison' 'Recommendation'; do
  if ! grep -qF "$phrase" docs/research/2026-09-project-operating-system-research.md; then
    printf 'research report missing section: %s\n' "$phrase" >&2
    failures=$((failures + 1))
  fi
  if ! grep -qF "$phrase" docs/research/2026-10-24-update-project-logic.md; then
    printf 'project logic research report missing section: %s\n' "$phrase" >&2
    failures=$((failures + 1))
  fi
done

if grep -RInE 'curl[[:space:]].*\|[[:space:]]*(sh|bash)|git[[:space:]]+push[[:space:]]+--force' docs/research >/dev/null 2>&1; then
  printf 'research check found an unsafe execution or publication instruction.\n' >&2
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  printf 'research check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'research check passed.\n'
