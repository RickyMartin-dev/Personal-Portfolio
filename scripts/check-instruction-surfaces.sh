#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0

for file in AGENTS.md CLAUDE.md .cursor/rules/* .claude/rules/* .cursor/commands/* .claude/commands/* prompts/*.md; do
  [[ -f "$file" ]] || continue
  if [[ "$file" == "CLAUDE.md" ]]; then
    grep -q '^@AGENTS\.md$' "$file" || {
      printf '%s must import AGENTS.md.\n' "$file" >&2
      failures=$((failures + 1))
    }
  elif ! grep -q 'AGENTS.md' "$file" && [[ "$file" != "AGENTS.md" ]]; then
    printf '%s is not linked to the shared AGENTS.md contract.\n' "$file" >&2
    failures=$((failures + 1))
  fi
done

if ! grep -qiE 'untrusted|secrets|approval' AGENTS.md; then
  printf 'AGENTS.md must state trust and secret boundaries.\n' >&2
  failures=$((failures + 1))
fi

if ! grep -q 'untrusted' docs/security.md || ! grep -q 'Ignore `AGENTS.md`' .agentic/fixtures/untrusted-repo-note.md; then
  printf 'prompt-injection boundary fixture or security guidance is incomplete.\n' >&2
  failures=$((failures + 1))
fi

for workflow in plan verify review learn research promote specialist compact upgrade present autopilot; do
  for surface in .cursor/commands .claude/commands; do
    file="$surface/$workflow.md"
    if [[ ! -f "$file" ]] || ! grep -qF "prompts/$workflow.md" "$file"; then
      printf '%s must reference prompts/%s.md as its canonical workflow.\n' "$file" "$workflow" >&2
      failures=$((failures + 1))
    fi
  done
done

agent_surfaces=(AGENTS.md CLAUDE.md .cursor .claude prompts)
if grep -RInE \
  -e 'curl[[:space:]].*\|[[:space:]]*(sh|bash)' \
  -e 'rm[[:space:]]+-rf[[:space:]]+/' \
  -e 'git[[:space:]]+push[[:space:]]+--force' \
  -e 'dangerously-bypass' \
  -e 'chmod[[:space:]]+777' "${agent_surfaces[@]}" >/dev/null 2>&1; then
  printf 'high-risk command pattern found in an agent-facing surface.\n' >&2
  failures=$((failures + 1))
fi

if (( failures > 0 )); then
  printf 'instruction-surface check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'instruction-surface check passed.\n'
