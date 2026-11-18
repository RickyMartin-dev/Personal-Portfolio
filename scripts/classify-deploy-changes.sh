#!/usr/bin/env bash
set -euo pipefail

if (( $# != 2 )); then
  printf 'usage: %s <last-successful-sha-or-empty> <current-sha>\n' "$0" >&2
  exit 2
fi

baseline="$1"
current="$2"
backend=false
frontend=false

full_deploy() {
  backend=true
  frontend=true
}

if [[ -z "$baseline" ]] || ! git cat-file -e "${baseline}^{commit}" 2>/dev/null || \
  ! git cat-file -e "${current}^{commit}" 2>/dev/null || \
  ! git merge-base --is-ancestor "$baseline" "$current"; then
  full_deploy
else
  # Include every changed path in the release range, including files added
  # and later deleted before the current release. This can trigger a safe
  # extra deploy, but cannot miss a backend or frontend change in a push batch.
  if ! changed_paths="$(git log --name-only --no-renames --diff-merges=first-parent --format= "$baseline..$current")"; then
    full_deploy
  else
    while IFS= read -r path; do
      case "$path" in
      frontend/production-api-endpoint.txt)
        backend=true
        frontend=true
        ;;
      frontend/index.html|frontend/assistant-panel.html|frontend/build.py|frontend/pages/*|frontend/assets/*|frontend/images/*)
        frontend=true
        ;;
      backend/src/*|backend/Dockerfile|backend/.dockerignore|backend/requirements.txt|backend/infra/terraform/*.tf|backend/infra/terraform/.terraform.lock.hcl)
        backend=true
        ;;
      .github/workflows/deploy.yml)
        backend=true
        frontend=true
        ;;
      esac
    done <<< "$changed_paths"
  fi
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    printf 'backend=%s\n' "$backend"
    printf 'frontend=%s\n' "$frontend"
  } >> "$GITHUB_OUTPUT"
else
  printf 'backend=%s\nfrontend=%s\n' "$backend" "$frontend"
fi
