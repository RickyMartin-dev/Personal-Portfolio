#!/usr/bin/env bash
set -euo pipefail

checkpoint="${1:-}"
fallback='Review active plans and project upgrade suggestions to choose the next task.'

if [[ -z "$checkpoint" || ! -f "$checkpoint" ]]; then
  printf '%s\n' "$fallback"
  exit 0
fi

action="$(awk '
  /^## Open work and next action[[:space:]]*$/ { in_section = 1; next }
  /^## / { if (in_section) exit }
  in_section && NF {
    sub(/^[[:space:]]*[-*][[:space:]]*/, "")
    print
    exit
  }
' "$checkpoint")"

action="$(printf '%s' "$action" | tr '\r\n\t' '   ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')"
case "$action" in
  ''|'<'*|'Update before compaction or handoff.') action="$fallback" ;;
esac

printf '%s\n' "$action"
