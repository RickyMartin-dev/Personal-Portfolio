#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

workflow_files=()
while IFS= read -r file; do
  workflow_files+=("$file")
done < <(find .github/workflows -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) -print 2>/dev/null | sort)

if (( ${#workflow_files[@]} == 0 )); then
  printf 'workflow check passed: no workflows found.\n'
  exit 0
fi

failures=0
for file in "${workflow_files[@]}"; do
  workflow_name="${file##*/}"
  if ! awk '
    /^permissions:[[:space:]]*$/ { in_permissions = 1; next }
    in_permissions && /^[^[:space:]]/ { in_permissions = 0 }
    in_permissions && /^  contents:[[:space:]]+read[[:space:]]*$/ { contents_read = 1 }
    END { exit((contents_read) ? 0 : 1) }
  ' "$file"; then
    printf '%s must declare read-only contents permissions.\n' "$file" >&2
    failures=$((failures + 1))
  fi

  if grep -nE 'pull_request_target|persist-credentials:[[:space:]]*true|github\.event' "$file" >/dev/null; then
    printf '%s contains an unsafe trigger, checkout credential setting, or direct untrusted event interpolation.\n' "$file" >&2
    failures=$((failures + 1))
  fi

  if [[ "$workflow_name" == 'deploy.yml' ]]; then
    while IFS= read -r permission_line; do
      if [[ ! "$permission_line" =~ (pages|id-token):[[:space:]]+write([[:space:]]|$) ]]; then
        printf '%s contains an unapproved write-capable workflow permission: %s\n' "$file" "$permission_line" >&2
        failures=$((failures + 1))
      fi
    done < <(grep -nE '(^|[[:space:]])(actions|attestations|checks|contents|deployments|discussions|id-token|issues|models|packages|pages|pull-requests|repository-projects|security-events|statuses):[[:space:]]*(write|write-all)|(^|[[:space:]])permissions:[[:space:]]*(write-all|read-all)' "$file" || true)
    if ! grep -Eq '^[[:space:]]+pages:[[:space:]]+write[[:space:]]*$' "$file" || \
      ! grep -Eq '^[[:space:]]+id-token:[[:space:]]+write[[:space:]]*$' "$file"; then
      printf '%s must grant only the Pages and OIDC write permissions required for deployment.\n' "$file" >&2
      failures=$((failures + 1))
    fi
  elif grep -nE '(^|[[:space:]])(actions|attestations|checks|contents|deployments|discussions|id-token|issues|models|packages|pages|pull-requests|repository-projects|security-events|statuses):[[:space:]]*(write|write-all)|(^|[[:space:]])permissions:[[:space:]]*(write-all|read-all)' "$file" >/dev/null; then
    printf '%s contains a write-capable or overly broad workflow permission.\n' "$file" >&2
    failures=$((failures + 1))
  fi

  if ! awk '
    function indent(value) { match(value, /^[ ]*/); return RLENGTH }
    function finish_step() {
      if (checkout_step && !credential_false) invalid = 1
      checkout_step = 0
      credential_false = 0
      active_step = 0
    }
    {
      current_indent = indent($0)
      if ($0 ~ /^[ ]*-[ ]+/) {
        if (active_step && current_indent <= step_indent) finish_step()
        active_step = 1
        step_indent = current_indent
        checkout_step = ($0 ~ /-[ ]+uses:[ ]+actions\/checkout@/)
        credential_false = ($0 ~ /persist-credentials:[ ]+false/)
        next
      }
      if (active_step && current_indent <= step_indent && $0 !~ /^[ ]*$/) finish_step()
      if (active_step && $0 ~ /^[ ]+uses:[ ]+actions\/checkout@/) checkout_step = 1
      if (active_step && $0 ~ /^[ ]+persist-credentials:[ ]+false[ ]*$/) credential_false = 1
    }
    END {
      finish_step()
      exit(invalid ? 1 : 0)
    }
  ' "$file"; then
    printf '%s must disable checkout credential persistence for every checkout step.\n' "$file" >&2
    failures=$((failures + 1))
  fi

  job_count="$(awk '
    /^jobs:[[:space:]]*$/ { in_jobs=1; next }
    in_jobs && /^[^[:space:]]/ { in_jobs=0 }
    in_jobs && /^  [A-Za-z0-9_.-]+:[[:space:]]*$/ { count++ }
    END { print count + 0 }
  ' "$file")"
  timeout_count="$(awk '
    /^jobs:[[:space:]]*$/ { in_jobs=1; next }
    in_jobs && /^[^[:space:]]/ { in_jobs=0 }
    in_jobs && /^    timeout-minutes:[[:space:]]*[0-9]+[[:space:]]*$/ { count++ }
    END { print count + 0 }
  ' "$file")"
  if (( job_count == 0 || timeout_count < job_count )); then
    printf '%s must set a timeout for every job.\n' "$file" >&2
    failures=$((failures + 1))
  fi

  while IFS= read -r line; do
    ref="$(printf '%s\n' "$line" | sed -E 's/.*uses:[[:space:]]*([^[:space:]#]+).*/\1/')"
    if [[ "$ref" == ./* ]]; then
      continue
    fi
    if [[ ! "$ref" =~ ^[^@]+@[0-9a-fA-F]{40}$ ]]; then
      printf '%s has an unpinned action reference: %s\n' "$file" "$ref" >&2
      failures=$((failures + 1))
    fi
  done < <(grep -E 'uses:[[:space:]]*[^#]+' "$file" || true)
done

if (( failures > 0 )); then
  printf 'workflow check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'workflow check passed: %s workflow(s).\n' "${#workflow_files[@]}"
