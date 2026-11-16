#!/usr/bin/env bash
set -euo pipefail

for job in STARTER_SECURITY BACKEND FRONTEND TERRAFORM; do
  variable="${job}_RESULT"
  result="${!variable}"
  if [[ "$result" != "success" ]]; then
    echo "::error::Required quality job $job finished with '$result'."
    exit 1
  fi
done
