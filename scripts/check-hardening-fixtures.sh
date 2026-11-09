#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/project-starter-hardening.XXXXXX")"
trap 'rm -rf "$TEMP_DIR"' EXIT

failures=0
copy_fixture() {
  mkdir -p "$TEMP_DIR/.github/workflows" "$TEMP_DIR/.agentic/fixtures" "$TEMP_DIR/scripts" "$TEMP_DIR/.cursor/rules" "$TEMP_DIR/.cursor/commands" "$TEMP_DIR/.claude/rules" "$TEMP_DIR/.claude/commands" "$TEMP_DIR/.claude/skills/update-project-logic/references" "$TEMP_DIR/.claude/skills/update-project-logic/evals" "$TEMP_DIR/.agents/skills/update-project-logic/references" "$TEMP_DIR/.agents/skills/update-project-logic/evals" "$TEMP_DIR/prompts" "$TEMP_DIR/docs/state/proposals" "$TEMP_DIR/docs/compactions" "$TEMP_DIR/docs/research" "$TEMP_DIR/docs/upgrades" "$TEMP_DIR/agents/specialists" "$TEMP_DIR/.lavish" "$TEMP_DIR/.githooks"
  cp "$ROOT_DIR/scripts/check-secrets.sh" "$TEMP_DIR/scripts/"
  cp "$ROOT_DIR/scripts/check-workflows.sh" "$TEMP_DIR/scripts/"
  cp "$ROOT_DIR/scripts/check-instruction-surfaces.sh" "$TEMP_DIR/scripts/"
  cp "$ROOT_DIR/scripts/check-manifest.sh" "$TEMP_DIR/scripts/"
  cp "$ROOT_DIR/scripts/check-snapshot-archive.sh" "$TEMP_DIR/scripts/"
  cp "$ROOT_DIR/scripts/check-project-logic-skill.sh" "$TEMP_DIR/scripts/"
  cp "$ROOT_DIR/scripts/archive_snapshot.py" "$TEMP_DIR/scripts/"
  cp "$ROOT_DIR/.agentic/manifest.json" "$TEMP_DIR/.agentic/"
  cp "$ROOT_DIR/.agentic/secret-scan-ignore" "$TEMP_DIR/.agentic/"
  cp "$ROOT_DIR/.agentic/fixtures/untrusted-repo-note.md" "$TEMP_DIR/.agentic/fixtures/"
  cp "$ROOT_DIR/.agents/skills/update-project-logic/SKILL.md" "$TEMP_DIR/.agents/skills/update-project-logic/"
  cp "$ROOT_DIR/.agents/skills/update-project-logic/references/research-method.md" "$TEMP_DIR/.agents/skills/update-project-logic/references/"
  cp "$ROOT_DIR/.agents/skills/update-project-logic/evals/prompts.csv" "$TEMP_DIR/.agents/skills/update-project-logic/evals/"
  cp "$ROOT_DIR/.claude/skills/update-project-logic/SKILL.md" "$TEMP_DIR/.claude/skills/update-project-logic/"
  cp "$ROOT_DIR/.claude/skills/update-project-logic/references/research-method.md" "$TEMP_DIR/.claude/skills/update-project-logic/references/"
  cp "$ROOT_DIR/.claude/skills/update-project-logic/evals/prompts.csv" "$TEMP_DIR/.claude/skills/update-project-logic/evals/"
  cp "$ROOT_DIR/AGENTS.md" "$TEMP_DIR/"
  cp "$ROOT_DIR/CLAUDE.md" "$TEMP_DIR/"
  cp "$ROOT_DIR/.cursor/rules/00-shared-context.mdc" "$TEMP_DIR/.cursor/rules/"
  cp "$ROOT_DIR/.claude/rules/00-shared-context.md" "$TEMP_DIR/.claude/rules/"
  cp "$ROOT_DIR/.cursor/commands/"*.md "$TEMP_DIR/.cursor/commands/"
  cp "$ROOT_DIR/.claude/commands/"*.md "$TEMP_DIR/.claude/commands/"
  cp "$ROOT_DIR/prompts/"*.md "$TEMP_DIR/prompts/"
  cp "$ROOT_DIR/docs/security.md" "$TEMP_DIR/docs/"
  cp "$ROOT_DIR/docs/state/README.md" "$TEMP_DIR/docs/state/"
  cp "$ROOT_DIR/docs/state/proposals/README.md" "$TEMP_DIR/docs/state/proposals/"
  cp "$ROOT_DIR/docs/operating-system.md" "$TEMP_DIR/docs/"
  cp "$ROOT_DIR/docs/automation.md" "$TEMP_DIR/docs/"
  cp "$ROOT_DIR/docs/compactions/README.md" "$TEMP_DIR/docs/compactions/"
  cp "$ROOT_DIR/docs/state/automatic-handoff.md" "$TEMP_DIR/docs/state/"
  cp "$ROOT_DIR/docs/research/README.md" "$TEMP_DIR/docs/research/"
  cp "$ROOT_DIR/docs/upgrades/README.md" "$TEMP_DIR/docs/upgrades/"
  cp "$ROOT_DIR/agents/README.md" "$TEMP_DIR/agents/"
  cp "$ROOT_DIR/docs/presentations/README.md" "$TEMP_DIR/docs/"
  cp "$ROOT_DIR/.lavish/project-starter-operating-system.html" "$TEMP_DIR/.lavish/"
  cp "$ROOT_DIR/.githooks/"* "$TEMP_DIR/.githooks/"
  : > "$TEMP_DIR/agents/specialists/.gitkeep"
  mkdir -p "$TEMP_DIR/backend"
  git -C "$TEMP_DIR" init -q
  git -C "$TEMP_DIR" config user.email fixture@example.invalid
  git -C "$TEMP_DIR" config user.name fixture
  git -C "$TEMP_DIR" add -A
}

expect_failure_with_message() {
  local label="$1"
  local expected="$2"
  shift 2
  local output
  if output=$("$@" 2>&1); then
    printf 'hardening fixture unexpectedly passed: %s\n' "$label" >&2
    failures=$((failures + 1))
  elif ! grep -qF "$expected" <<<"$output"; then
    printf 'hardening fixture failed for the wrong reason: %s\n' "$label" >&2
    printf '%s\n' "$output" >&2
    failures=$((failures + 1))
  fi
}

copy_fixture
cat > "$TEMP_DIR/backend/.env.example" <<'EOF'
AWS_BEARER_TOKEN_BEDROCK=
AWS_PROFILE=default
EOF
if ! (
  cd "$TEMP_DIR" &&
  bash scripts/check-secrets.sh &&
  bash scripts/check-workflows.sh &&
  bash scripts/check-instruction-surfaces.sh &&
  bash scripts/check-manifest.sh &&
  bash scripts/check-project-logic-skill.sh
); then
  printf 'hardening fixture baseline unexpectedly failed.\n' >&2
  exit 1
fi

printf 'AKIA%s\n' '1234567890ABCDEF' > "$TEMP_DIR/fake-leak.txt"
expect_failure_with_message "credential pattern" "possible credential material" bash -c "cd '$TEMP_DIR' && bash scripts/check-secrets.sh"
rm -f "$TEMP_DIR/fake-leak.txt"

printf 'AWS_BEARER_TOKEN_BEDROCK=placeholder-only\n' > "$TEMP_DIR/.env.local"
expect_failure_with_message "local environment file" "sensitive-looking file found" bash -c "cd '$TEMP_DIR' && bash scripts/check-secrets.sh"
rm -f "$TEMP_DIR/.env.local"

key_kind='PRIVATE KEY'
printf '%s\n' "-----BEGIN ${key_kind}-----" "fake" "-----END ${key_kind}-----" > "$TEMP_DIR/fake-private-key.txt"
expect_failure_with_message "generic private-key pattern" "possible credential material" bash -c "cd '$TEMP_DIR' && bash scripts/check-secrets.sh"
rm -f "$TEMP_DIR/fake-private-key.txt"

printf 'ignored-secret.txt\n' > "$TEMP_DIR/.gitignore"
ignored_prefix='xoxb'
printf '%s\n' "${ignored_prefix}-12345678901234567890" > "$TEMP_DIR/ignored-secret.txt"
expect_failure_with_message "ignored credential pattern" "possible credential material" bash -c "cd '$TEMP_DIR' && bash scripts/check-secrets.sh"
rm -f "$TEMP_DIR/ignored-secret.txt" "$TEMP_DIR/.gitignore"

# Secret scan allowlist: ignored files are skipped, tracked or unignored ones fail.
allow_dir=".agents/skills/impeccable/scripts/bin"
mkdir -p "$TEMP_DIR/$allow_dir"
printf 'AKIA%s\n' '1234567890ABCDEF' > "$TEMP_DIR/$allow_dir/engine"
printf '%s/\n' "$allow_dir" > "$TEMP_DIR/.gitignore"
if ! (cd "$TEMP_DIR" && bash scripts/check-secrets.sh >/dev/null 2>&1); then
  printf 'hardening fixture failed: allowlisted gitignored file should pass the secret scan.\n' >&2
  failures=$((failures + 1))
fi
rm -f "$TEMP_DIR/.gitignore"
expect_failure_with_message "allowlisted but not ignored" "secret scan allowlist violation" bash -c "cd '$TEMP_DIR' && bash scripts/check-secrets.sh"
git -C "$TEMP_DIR" add -f "$allow_dir/engine"
expect_failure_with_message "allowlisted but tracked" "secret scan allowlist violation" bash -c "cd '$TEMP_DIR' && bash scripts/check-secrets.sh"
git -C "$TEMP_DIR" rm -q -f --cached "$allow_dir/engine"
rm -f "$TEMP_DIR/$allow_dir/engine"

cat > "$TEMP_DIR/.github/workflows/unpinned.yml" <<'EOF'
name: bad
on: pull_request
permissions:
  contents: read
jobs:
  bad:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - name: Unpinned named action
        uses: actions/checkout@v4
      - name: Unpinned reusable workflow
        uses: example/repo/.github/workflows/reusable.yml@v1
EOF
expect_failure_with_message "unpinned action" "unpinned action reference" bash -c "cd '$TEMP_DIR' && bash scripts/check-workflows.sh"
rm -f "$TEMP_DIR/.github/workflows/unpinned.yml"

cat > "$TEMP_DIR/.github/workflows/job-only-permission.yml" <<'EOF'
name: job-only permission
on: pull_request
jobs:
  bad:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
        with:
          persist-credentials: false
EOF
expect_failure_with_message "top-level workflow permission" "read-only contents permissions" bash -c "cd '$TEMP_DIR' && bash scripts/check-workflows.sh"
rm -f "$TEMP_DIR/.github/workflows/job-only-permission.yml"

cat > "$TEMP_DIR/.github/workflows/checkout.yml" <<'EOF'
name: incomplete checkout hardening
on: pull_request
permissions:
  contents: read
jobs:
  bad:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
        with:
          persist-credentials: false
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
      - name: Unrelated input with the same key
        uses: actions/upload-artifact@11bd71901bbe5b1630ceea73d27597364c9af683
        with:
          persist-credentials: false
EOF
expect_failure_with_message "checkout credential persistence" "every checkout step" bash -c "cd '$TEMP_DIR' && bash scripts/check-workflows.sh"
rm -f "$TEMP_DIR/.github/workflows/checkout.yml"

cat > "$TEMP_DIR/.github/workflows/timeout.yml" <<'EOF'
name: incomplete timeout hardening
on: pull_request
permissions:
  contents: read
jobs:
  first:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - run: true
  second:
    runs-on: ubuntu-latest
    steps:
      - run: true
EOF
expect_failure_with_message "job timeout coverage" "every job" bash -c "cd '$TEMP_DIR' && bash scripts/check-workflows.sh"
rm -f "$TEMP_DIR/.github/workflows/timeout.yml"

cat > "$TEMP_DIR/.github/workflows/injection.yml" <<'EOF'
name: unsafe interpolation
on: pull_request
permissions:
  contents: read
jobs:
  bad:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
        with:
          persist-credentials: false
      - name: Untrusted input
        run: |
          printf '%s\n' "${{ github.event.pull_request.title }}"
EOF
expect_failure_with_message "workflow injection and job permission" "direct untrusted event interpolation" bash -c "cd '$TEMP_DIR' && bash scripts/check-workflows.sh"
rm -f "$TEMP_DIR/.github/workflows/injection.yml"

cat > "$TEMP_DIR/.github/workflows/event-context.yml" <<'EOF'
name: unsafe event context
on: pull_request
permissions:
  contents: read
jobs:
  bad:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
        with:
          persist-credentials: false
      - run: printf '%s\n' "${{ github.event }}"
EOF
expect_failure_with_message "generic event context interpolation" "direct untrusted event interpolation" bash -c "cd '$TEMP_DIR' && bash scripts/check-workflows.sh"
rm -f "$TEMP_DIR/.github/workflows/event-context.yml"

cat > "$TEMP_DIR/.github/workflows/job-permission.yml" <<'EOF'
name: unsafe job permission
on: pull_request
permissions:
  contents: read
jobs:
  bad:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
        with:
          persist-credentials: false
EOF
expect_failure_with_message "job-level permission" "workflow permission" bash -c "cd '$TEMP_DIR' && bash scripts/check-workflows.sh"
rm -f "$TEMP_DIR/.github/workflows/job-permission.yml"

printf '\nrm -rf /\n' >> "$TEMP_DIR/prompts/verify.md"
expect_failure_with_message "unsafe instruction" "high-risk command pattern" bash -c "cd '$TEMP_DIR' && bash scripts/check-instruction-surfaces.sh"
rm -f "$TEMP_DIR/prompts/verify.md"

printf '{\n  "sourceOfTruth": "wrong"\n}\n' > "$TEMP_DIR/.agentic/manifest.json"
expect_failure_with_message "invalid manifest contract" "sourceOfTruth must remain AGENTS.md" bash -c "cd '$TEMP_DIR' && bash scripts/check-manifest.sh"

cp "$ROOT_DIR/.agentic/manifest.json" "$TEMP_DIR/.agentic/manifest.json"
awk '{gsub(/scripts\/check-learning\.sh/, "scripts/check-does-not-exist.sh"); print}' "$TEMP_DIR/.agentic/manifest.json" > "$TEMP_DIR/.agentic/manifest.modified.json"
mv "$TEMP_DIR/.agentic/manifest.modified.json" "$TEMP_DIR/.agentic/manifest.json"
expect_failure_with_message "manifest check drift" "manifest hardeningChecks is missing" bash -c "cd '$TEMP_DIR' && bash scripts/check-manifest.sh"

cp "$ROOT_DIR/.agentic/manifest.json" "$TEMP_DIR/.agentic/manifest.json"
awk '{if ($0 ~ /^[[:space:]]*}[[:space:]]*$/) print "  not-json"; print}' "$TEMP_DIR/.agentic/manifest.json" > "$TEMP_DIR/.agentic/manifest.modified.json"
mv "$TEMP_DIR/.agentic/manifest.modified.json" "$TEMP_DIR/.agentic/manifest.json"
expect_failure_with_message "malformed manifest shape" "manifest JSON shape is invalid" bash -c "cd '$TEMP_DIR' && bash scripts/check-manifest.sh"

cp "$ROOT_DIR/.agentic/manifest.json" "$TEMP_DIR/.agentic/manifest.json"
sed 's/"schemaVersion": 1,/"schemaVersion": 1/' "$TEMP_DIR/.agentic/manifest.json" > "$TEMP_DIR/.agentic/manifest.modified.json"
mv "$TEMP_DIR/.agentic/manifest.modified.json" "$TEMP_DIR/.agentic/manifest.json"
expect_failure_with_message "missing manifest comma" "manifest JSON shape is invalid" bash -c "cd '$TEMP_DIR' && bash scripts/check-manifest.sh"

cp "$ROOT_DIR/.agentic/manifest.json" "$TEMP_DIR/.agentic/manifest.json"
sed 's/^  "upgradePolicy": \(.*\)$/  "upgradePolicy": \1,/' "$TEMP_DIR/.agentic/manifest.json" > "$TEMP_DIR/.agentic/manifest.modified.json"
mv "$TEMP_DIR/.agentic/manifest.modified.json" "$TEMP_DIR/.agentic/manifest.json"
expect_failure_with_message "trailing manifest comma" "manifest JSON shape is invalid" bash -c "cd '$TEMP_DIR' && bash scripts/check-manifest.sh"

cp "$ROOT_DIR/.agentic/manifest.json" "$TEMP_DIR/.agentic/manifest.json"
sed 's/^  "upgradePolicy": \(.*\)$/  "designSkill": {\n    "name": "impeccable"\n  },\n  "upgradePolicy": \1/' "$TEMP_DIR/.agentic/manifest.json" > "$TEMP_DIR/.agentic/manifest.modified.json"
mv "$TEMP_DIR/.agentic/manifest.modified.json" "$TEMP_DIR/.agentic/manifest.json"
expect_failure_with_message "nested manifest object" 'manifest key "designSkill" must be a string or an array of strings' bash -c "cd '$TEMP_DIR' && bash scripts/check-manifest.sh"
cp "$ROOT_DIR/.agentic/manifest.json" "$TEMP_DIR/.agentic/manifest.json"

# Git hooks after checkout/merge are advisory: a failing project start must not block.
mkdir -p "$TEMP_DIR/scripts"
printf '#!/usr/bin/env bash\nexit 1\n' > "$TEMP_DIR/scripts/project"
chmod +x "$TEMP_DIR/scripts/project"
for hook in post-checkout post-merge; do
  if ! hook_output=$(cd "$TEMP_DIR" && bash ".githooks/$hook" 2>&1); then
    printf 'hardening fixture failed: %s must exit 0 when project start fails.\n' "$hook" >&2
    failures=$((failures + 1))
  elif ! grep -qF 'project start reported problems after checkout; run ./scripts/project check for details.' <<<"$hook_output"; then
    printf 'hardening fixture failed: %s did not print the advisory line.\n' "$hook" >&2
    failures=$((failures + 1))
  fi
done
rm -f "$TEMP_DIR/scripts/project"

# Lavish pages must use the shared theme and keep buttons clickable under the review overlay.
DESIGN_DIR="$TEMP_DIR/design-fixture"
mkdir -p "$DESIGN_DIR/scripts" "$DESIGN_DIR/.lavish" "$DESIGN_DIR/prompts" "$DESIGN_DIR/.claude/agents" "$DESIGN_DIR/.cursor/agents" "$DESIGN_DIR/.codex"
cp "$ROOT_DIR/scripts/check-design.sh" "$DESIGN_DIR/scripts/"
for file in PRODUCT.md DESIGN.md .lavish/theme.css .lavish/theme.js .claude/agents/impeccable-finish-reviewer.md .cursor/agents/impeccable-finish-reviewer.md; do
  : > "$DESIGN_DIR/$file"
done
for provider in .agents .claude .cursor; do
  mkdir -p "$DESIGN_DIR/$provider/skills/impeccable/scripts/bin"
  : > "$DESIGN_DIR/$provider/skills/impeccable/SKILL.md"
  printf '%s/skills/impeccable/scripts/bin/\n' "$provider" >> "$DESIGN_DIR/.gitignore"
done
for hook in .claude/settings.json .cursor/hooks.json .codex/hooks.json; do
  mkdir -p "$DESIGN_DIR/$(dirname "$hook")"
  printf 'skills/impeccable/scripts/impeccable\n' > "$DESIGN_DIR/$hook"
done
printf 'impeccable\n' > "$DESIGN_DIR/prompts/present.md"
printf 'DESIGN.md\n' > "$DESIGN_DIR/AGENTS.md"
git -C "$DESIGN_DIR" init -q
good_page='<!doctype html><link rel="stylesheet" href="theme.css"><script src="theme.js"></script><nav class="lv-links"><a href="#one" data-lavish-action>One</a></nav><button data-lavish-action="next">Next</button>'
printf '%s\n' "$good_page" > "$DESIGN_DIR/.lavish/page.html"
if ! (cd "$DESIGN_DIR" && bash scripts/check-design.sh >/dev/null 2>&1); then
  printf 'hardening fixture failed: compliant Lavish page should pass the design check.\n' >&2
  failures=$((failures + 1))
fi
printf '<!doctype html><script src="theme.js"></script>\n' > "$DESIGN_DIR/.lavish/page.html"
expect_failure_with_message "lavish page without theme.css" "Lavish page must link theme.css" bash -c "cd '$DESIGN_DIR' && bash scripts/check-design.sh"
printf '%s\n<script src="https://cdn.tailwindcss.com"></script>\n' "$good_page" > "$DESIGN_DIR/.lavish/page.html"
expect_failure_with_message "lavish page with tailwind cdn" "must not load Tailwind" bash -c "cd '$DESIGN_DIR' && bash scripts/check-design.sh"
printf '%s\n<button class="btn"\n  type="button">Bad</button>\n' "$good_page" > "$DESIGN_DIR/.lavish/page.html"
expect_failure_with_message "lavish button without data-lavish-action" "missing data-lavish-action" bash -c "cd '$DESIGN_DIR' && bash scripts/check-design.sh"
printf '<!doctype html><link rel="stylesheet" href="theme.css"><script src="theme.js"></script><nav class="lv-links"><a href="#one">One</a></nav>\n' > "$DESIGN_DIR/.lavish/page.html"
expect_failure_with_message "lavish nav link without data-lavish-action" "Lavish section nav link is missing data-lavish-action" bash -c "cd '$DESIGN_DIR' && bash scripts/check-design.sh"

if (( failures > 0 )); then
  printf 'hardening fixture check failed with %s issue(s).\n' "$failures" >&2
  exit 1
fi

printf 'hardening fixture check passed: all negative cases were rejected.\n'
