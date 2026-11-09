#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

codex_skill=".agents/skills/update-project-logic/SKILL.md"
claude_skill=".claude/skills/update-project-logic/SKILL.md"
codex_reference=".agents/skills/update-project-logic/references/research-method.md"
claude_reference=".claude/skills/update-project-logic/references/research-method.md"
codex_evals=".agents/skills/update-project-logic/evals/prompts.csv"
claude_evals=".claude/skills/update-project-logic/evals/prompts.csv"
failures=0

for file in "$codex_skill" "$claude_skill" "$codex_reference" "$claude_reference" "$codex_evals" "$claude_evals"; do
  if [[ ! -f "$file" ]]; then
    printf 'project logic skill check missing: %s\n' "$file" >&2
    failures=$((failures + 1))
  fi
done

if (( failures == 0 )); then
  if ! cmp -s "$codex_skill" "$claude_skill"; then
    printf 'Codex and Claude project logic skill copies have drifted.\n' >&2
    failures=$((failures + 1))
  fi
  if ! cmp -s "$codex_reference" "$claude_reference"; then
    printf 'Codex and Claude project logic research references have drifted.\n' >&2
    failures=$((failures + 1))
  fi
  if ! cmp -s "$codex_evals" "$claude_evals"; then
    printf 'Codex and Claude project logic eval prompts have drifted.\n' >&2
    failures=$((failures + 1))
  fi
  if ! grep -q '^name: update-project-logic$' "$codex_skill" || ! grep -q '^description: Refresh project guidance, audit improvements and risks' "$codex_skill"; then
    printf 'project logic skill frontmatter is missing its expected name or description.\n' >&2
    failures=$((failures + 1))
  fi
  for trigger in '/update-project-logic' '$update-project-logic'; do
    if ! grep -qF "$trigger" "$codex_skill"; then
      printf 'project logic skill is missing provider trigger: %s\n' "$trigger" >&2
      failures=$((failures + 1))
    fi
  done
  if ! grep -qF '[references/research-method.md](references/research-method.md)' "$codex_skill"; then
    printf 'project logic skill does not link its research method.\n' >&2
    failures=$((failures + 1))
  fi
  if grep -nE '<(fill|replace|insert)[^>]*>' "$codex_skill" "$codex_reference" >/dev/null 2>&1; then
    printf 'project logic skill contains an unfinished scaffold placeholder.\n' >&2
    failures=$((failures + 1))
  fi
  eval_rows="$(wc -l < "$codex_evals" | tr -d ' ')"
  if (( eval_rows < 5 )) || ! grep -q '^case_id,should_trigger,prompt,expected_behavior$' "$codex_evals"; then
    printf 'project logic skill eval set must contain a header and positive/negative cases.\n' >&2
    failures=$((failures + 1))
  fi
  if ! grep -q '^cli_version_drift,true,' "$codex_evals"; then
    printf 'project logic skill eval set is missing the provider-version drift case.\n' >&2
    failures=$((failures + 1))
  fi
fi

if (( failures > 0 )); then
  printf 'project logic skill check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'project logic skill check passed: Codex and Claude copies match.\n'
