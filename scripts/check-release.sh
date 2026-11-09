#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

"$ROOT_DIR/scripts/check-starter.sh"
if [[ -d .git ]]; then
  # Check the complete worktree relative to HEAD so staged changes cannot
  # bypass the release gate. Fall back to the index/worktree comparison for
  # a freshly initialized repository with no HEAD commit yet. Untracked files
  # receive a separate whitespace check below because Git does not include
  # them in a normal diff.
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    git diff --check HEAD --
  else
    git diff --check
  fi

  while IFS= read -r -d '' file; do
    untracked_diff="$(git diff --no-index --check /dev/null "$file" 2>&1 || true)"
    if grep -qE 'trailing whitespace|space before tab' <<<"$untracked_diff"; then
      printf 'whitespace errors detected in untracked file: %s\n' "$file" >&2
      exit 1
    fi
  done < <(git ls-files --others --exclude-standard -z)
fi

printf 'release check passed.\n'
