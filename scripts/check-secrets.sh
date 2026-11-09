#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0

if find . -type f ! -path './.git/*' ! -path './resources/*' ! -path './backend/.venv/*' ! -path './.venv/*' ! -path './.terraform/*' ! -path '*/.terraform/*' ! -path './scripts/check-secrets.sh' ! -path './.agentic/secret-scan-ignore' ! -path './backend/.env.example' \( \
  -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' -o \
  -iname '*credentials*' -o -iname '*secret*' \
\) -print -quit | grep -q .; then
  printf 'sensitive-looking file found; remove it or add a reviewed safe example: ' >&2
  find . -type f ! -path './.git/*' ! -path './resources/*' ! -path './backend/.venv/*' ! -path './.venv/*' ! -path './.terraform/*' ! -path '*/.terraform/*' ! -path './scripts/check-secrets.sh' ! -path './.agentic/secret-scan-ignore' ! -path './backend/.env.example' \( \
    -name '.env' -o -name '.env.*' -o -name '*.pem' -o -name '*.key' -o \
    -iname '*credentials*' -o -iname '*secret*' \
  \) -print >&2
  failures=$((failures + 1))
fi

credential_patterns=(
  'BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY|BEGIN (ENCRYPTED )?PRIVATE KEY'
  'AKIA[0-9A-Z]{16}'
  'ASIA[0-9A-Z]{16}'
  'gh[pousr]_[A-Za-z0-9_]{20,}'
  'github_pat_[A-Za-z0-9_]{20,}'
  'xox[baprs]-[A-Za-z0-9-]{20,}'
  'sk-[A-Za-z0-9]{20,}'
  'sk-proj-[A-Za-z0-9_-]{20,}'
)

# Reviewed allowlist of gitignored paths (downloaded binaries) that are skipped.
# A listed path is skipped only when git confirms it is ignored and untracked.
allowlist_file=".agentic/secret-scan-ignore"
allowlist_globs=()
if [[ -f "$allowlist_file" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -n "$line" ]] && allowlist_globs+=("$line")
  done < "$allowlist_file"
fi

is_allowlisted() {
  local candidate="$1" glob
  if (( ${#allowlist_globs[@]} == 0 )); then
    return 1
  fi
  for glob in "${allowlist_globs[@]}"; do
    # shellcheck disable=SC2053
    if [[ "$candidate" == $glob ]]; then
      return 0
    fi
  done
  return 1
}

scan_files=()
if [[ -d .git ]]; then
  while IFS= read -r -d '' file; do
    case "$file" in
      scripts/check-secrets.sh|.git/*|.codex/*|.agent-state/*|resources/*|node_modules/*|*/node_modules/*|.terraform/*|*/.terraform/*|.venv/*|*/.venv/*|dist/*|*/dist/*|build/*|coverage/*)
        continue
        ;;
      *)
        if is_allowlisted "$file"; then
          if git check-ignore -q -- "$file"; then
            continue
          fi
          printf 'secret scan allowlist violation: %s matches %s but is tracked or not gitignored; allowlisted paths must be gitignored.\n' "$file" "$allowlist_file" >&2
          failures=$((failures + 1))
        fi
        scan_files+=("$file")
        ;;
    esac
  done < <(
    git ls-files --cached -z
    git ls-files --others --exclude-standard -z
    git ls-files --others --ignored --exclude-standard -z
  )
else
  while IFS= read -r -d '' file; do
    relative_file="${file#./}"
    case "$relative_file" in
      scripts/check-secrets.sh|.git/*|.codex/*|.agent-state/*|resources/*|node_modules/*|*/node_modules/*|.terraform/*|*/.terraform/*|.venv/*|*/.venv/*|dist/*|*/dist/*|build/*|coverage/*)
        continue
        ;;
      *)
        scan_files+=("$relative_file")
        ;;
    esac
  done < <(find . -type f ! -path './.git/*' -print0)
fi

for pattern in "${credential_patterns[@]}"; do
  for file in "${scan_files[@]}"; do
    if grep -aE "$pattern" "$file" >/dev/null 2>&1; then
      printf 'possible credential material matched in %s: %s\n' "$file" "$pattern" >&2
      failures=$((failures + 1))
      break
    fi
  done
done

if (( failures > 0 )); then
  printf 'secret check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'secret check passed.\n'
