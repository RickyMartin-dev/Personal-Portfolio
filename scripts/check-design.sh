#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0
fail() {
  printf '%s\n' "$1" >&2
  failures=$((failures + 1))
}

for path in PRODUCT.md DESIGN.md .lavish/theme.css .lavish/theme.js \
  .claude/skills/impeccable/SKILL.md .agents/skills/impeccable/SKILL.md .cursor/skills/impeccable/SKILL.md \
  .claude/agents/impeccable-finish-reviewer.md .cursor/agents/impeccable-finish-reviewer.md; do
  [[ -f "$path" ]] || fail "design check missing: $path"
done

for hook in .claude/settings.json .cursor/hooks.json .codex/hooks.json; do
  if ! grep -qF 'skills/impeccable/scripts/impeccable' "$hook" 2>/dev/null; then
    fail "design hook missing from $hook; run: npx impeccable install --providers=claude,codex,cursor --scope=project"
  fi
done

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  for provider in .agents .claude .cursor; do
    if ! git check-ignore -q "$provider/skills/impeccable/scripts/bin/engine"; then
      fail "Impeccable engine binaries must stay ignored: $provider/skills/impeccable/scripts/bin/"
    fi
  done
fi

for page in .lavish/*.html; do
  [[ -f "$page" ]] || continue
  grep -qF 'theme.css' "$page" || fail "Lavish page must link theme.css: $page"
  grep -qF 'theme.js' "$page" || fail "Lavish page must load theme.js: $page"
  # Match loads (src/href/@import), not prose that merely mentions the names.
  if grep -qiE "(src|href)=[\"'][^\"']*(cdn\\.tailwindcss|@tailwindcss/browser|daisyui)|@import[^;]*(tailwindcss|daisyui)" "$page"; then
    fail "Lavish page must not load Tailwind or daisyUI; use the shared theme: $page"
  fi
  # Buttons need data-lavish-action so the Lavish review overlay lets clicks through.
  while IFS= read -r button; do
    [[ -n "$button" ]] || continue
    if ! grep -qF 'data-lavish-action' <<<"$button"; then
      fail "Lavish page button is missing data-lavish-action: $page: ${button:0:80}"
    fi
  done < <(tr '\n' ' ' < "$page" | grep -oiE '<button[^>]*>' || true)
  # Lavish's review overlay must let in-page navigation links reach their anchors.
  while IFS= read -r link; do
    [[ -n "$link" ]] || continue
    if ! grep -qF 'data-lavish-action' <<<"$link"; then
      fail "Lavish section nav link is missing data-lavish-action: $page: ${link:0:80}"
    fi
  done < <(
    tr '\n' ' ' < "$page" |
      grep -oiE '<nav[^>]*class="[^"]*lv-links[^"]*"[^>]*>.*</nav>' |
      grep -oiE '<a[^>]*>' || true
  )
done

grep -qF 'impeccable' prompts/present.md || fail 'prompts/present.md must route visual work through the impeccable skill.'
grep -qF 'DESIGN.md' AGENTS.md || fail 'AGENTS.md must point design work at DESIGN.md.'

if (( failures > 0 )); then
  printf 'design check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'design check passed.\n'
