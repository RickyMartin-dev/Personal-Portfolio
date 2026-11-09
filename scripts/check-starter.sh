#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_files=(
  "README.md"
  "SECURITY.md"
  "AGENTS.md"
  "CLAUDE.md"
  "docs/CHANGELOG.md"
  "docs/CONTRIBUTING.md"
  "docs/project-brief.md"
  "docs/project-commands.md"
  "docs/architecture.md"
  "docs/agent-workflow.md"
  "docs/quality.md"
  "docs/security.md"
  "docs/operating-system.md"
  "docs/automation.md"
  "docs/learning-path.md"
  "docs/second-brain/README.md"
  "docs/compactions/README.md"
  "docs/compactions/.gitkeep"
  "docs/templates/compaction.md"
  "docs/templates/research.md"
  "docs/templates/upgrade.md"
  "docs/templates/specialist.md"
  "docs/research/README.md"
  "docs/research/backlog.md"
  "docs/research/2026-09-project-operating-system-research.md"
  "docs/research/2026-10-24-update-project-logic.md"
  "docs/research/2026-09-luna-operating-system-ecosystems.md"
  "docs/research/2026-09-luna-operating-system-governance.md"
  "docs/research/2026-09-luna-operating-system-operations.md"
  "docs/upgrades/README.md"
  "docs/upgrades/backlog.md"
  "docs/upgrades/proposals/.gitkeep"
  "docs/presentations/README.md"
  "agents/README.md"
  "agents/roles/ui.md"
  "agents/roles/ux.md"
  "agents/roles/python.md"
  "agents/roles/trading.md"
  "agents/specialists/.gitkeep"
  ".lavish/project-starter-operating-system.html"
  ".lavish/repo-walkthrough.html"
  "docs/verification-log.md"
  "docs/plans/completed/hardening-review.md"
  "docs/experiments/README.md"
  "docs/experiments/log.md"
  "docs/experiments/runs/.gitkeep"
  "docs/experiments/runs/2026-09-title-rendering.md"
  "docs/research/agentic-starter-repos.md"
  "docs/research/2026-09-agentic-starter-scout.md"
  "docs/research/2026-09-hardening-research.md"
  "docs/research/2026-09-luna-ci-security.md"
  "docs/research/2026-09-luna-agent-boundaries.md"
  "docs/research/2026-09-luna-portability.md"
  "docs/research/2026-09-luna-learning.md"
  "docs/research/2026-09-luna-adversarial.md"
  "docs/state/README.md"
  "docs/state/current-task.md"
  "docs/state/next-task.md"
  "docs/state/handoff.md"
  "docs/state/automatic-handoff.md"
  "docs/state/risks.md"
  "docs/state/bugs.md"
  "docs/state/proposals/README.md"
  "docs/state/proposals/.gitkeep"
  "docs/state/archive/.gitkeep"
  "docs/templates/experiment.md"
  "docs/templates/handoff.md"
  "docs/templates/promotion.md"
  "docs/templates/scout-report.md"
  "prompts/plan.md"
  "prompts/implement.md"
  "prompts/verify.md"
  "prompts/review.md"
  "prompts/learn.md"
  "prompts/research.md"
  "prompts/promote.md"
  "prompts/factory.md"
  "prompts/specialist.md"
  "prompts/compact.md"
  "prompts/upgrade.md"
  "prompts/autopilot.md"
  "prompts/present.md"
  ".cursor/rules/00-shared-context.mdc"
  ".claude/rules/00-shared-context.md"
  ".cursor/commands/plan.md"
  ".cursor/commands/verify.md"
  ".cursor/commands/review.md"
  ".cursor/commands/learn.md"
  ".cursor/commands/research.md"
  ".claude/commands/plan.md"
  ".claude/commands/verify.md"
  ".claude/commands/review.md"
  ".claude/commands/learn.md"
  ".claude/commands/research.md"
  ".cursor/commands/promote.md"
  ".claude/commands/promote.md"
  ".cursor/commands/specialist.md"
  ".claude/commands/specialist.md"
  ".cursor/commands/compact.md"
  ".claude/commands/compact.md"
  ".cursor/commands/upgrade.md"
  ".cursor/commands/autopilot.md"
  ".cursor/commands/present.md"
  ".claude/commands/upgrade.md"
  ".claude/commands/autopilot.md"
  ".claude/commands/present.md"
  ".githooks/pre-commit"
  ".githooks/pre-push"
  ".githooks/post-checkout"
  ".githooks/post-merge"
  ".agentic/manifest.json"
  ".agentic/fixtures/untrusted-repo-note.md"
  ".github/dependabot.yml"
  ".github/workflows/quality.yml"
  ".github/workflows/security.yml"
  ".github/workflows/upgrade-review.yml"
  "scripts/project"
  "scripts/snapshot-next-action.sh"
  "scripts/check-starter.sh"
  "scripts/check-secrets.sh"
  "scripts/check-workflows.sh"
  "scripts/check-instruction-surfaces.sh"
  "scripts/check-manifest.sh"
  "scripts/check-hardening-fixtures.sh"
  "scripts/check-learning.sh"
  "scripts/check-memory.sh"
  "scripts/check-research.sh"
  "scripts/check-upgrades.sh"
  "scripts/check-specialists.sh"
  "scripts/check-presentation.sh"
  "scripts/check-design.sh"
  "docs/state/friction.md"
  ".agentic/secret-scan-ignore"
  "PRODUCT.md"
  "DESIGN.md"
  ".claude/settings.json"
  ".lavish/theme.css"
  ".lavish/theme.js"
  "scripts/check-automation.sh"
  "scripts/archive_snapshot.py"
  "scripts/check-snapshot-archive.sh"
  ".agents/skills/update-project-logic/SKILL.md"
  ".agents/skills/update-project-logic/references/research-method.md"
  ".agents/skills/update-project-logic/evals/prompts.csv"
  ".claude/skills/update-project-logic/SKILL.md"
  ".claude/skills/update-project-logic/references/research-method.md"
  ".claude/skills/update-project-logic/evals/prompts.csv"
  "scripts/check-project-logic-skill.sh"
)

failures=0
for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    printf 'missing: %s\n' "$file" >&2
    failures=$((failures + 1))
  fi
done

for path in CHANGELOG.md CONTRIBUTING.md; do
  if [[ -e "$path" ]]; then
    printf '%s belongs under docs/ so root keeps only integration entrypoints.\n' "$path" >&2
    failures=$((failures + 1))
  fi
done

for link in 'docs/CHANGELOG.md' 'docs/CONTRIBUTING.md'; do
  if ! grep -qF "]($link)" README.md; then
    printf 'README.md must link to %s.\n' "$link" >&2
    failures=$((failures + 1))
  fi
done

agents_lines="$(wc -l < AGENTS.md | tr -d ' ')"
if (( agents_lines > 120 )); then
  printf 'AGENTS.md is %s lines; keep the root map under 120 lines.\n' "$agents_lines" >&2
  failures=$((failures + 1))
fi

if ! grep -q '^@AGENTS\.md$' CLAUDE.md; then
  printf 'CLAUDE.md must import AGENTS.md as its shared source of truth.\n' >&2
  failures=$((failures + 1))
fi

if ! grep -q 'AGENTS.md' .cursor/rules/00-shared-context.mdc; then
  printf 'Cursor shared rule must point to AGENTS.md.\n' >&2
  failures=$((failures + 1))
fi

# Credential scanning lives in scripts/check-secrets.sh, which honors the reviewed .agentic/secret-scan-ignore allowlist.

for security_check in check-secrets.sh check-workflows.sh check-instruction-surfaces.sh check-manifest.sh check-hardening-fixtures.sh check-learning.sh check-memory.sh check-research.sh check-upgrades.sh check-specialists.sh check-presentation.sh check-design.sh check-automation.sh check-snapshot-archive.sh check-project-logic-skill.sh; do
  if ! bash "$ROOT_DIR/scripts/$security_check"; then
    failures=$((failures + 1))
  fi
done

while IFS= read -r script; do
  if [[ -f "$script" ]] && ! bash -n "$script"; then
    printf 'shell syntax error: %s\n' "$script" >&2
    failures=$((failures + 1))
  fi
done < <(find scripts -type f -name '*.sh' -print)

if [[ -d .git ]]; then
  if git rev-parse --verify HEAD >/dev/null 2>&1; then
    diff_check=(git diff --check HEAD --)
  else
    diff_check=(git diff --check)
  fi
  if ! "${diff_check[@]}"; then
    printf 'whitespace errors detected by git diff --check.\n' >&2
    failures=$((failures + 1))
  fi
fi

if (( failures > 0 )); then
  printf 'starter check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'starter check passed: %s required files, AGENTS.md=%s lines.\n' "${#required_files[@]}" "$agents_lines"
