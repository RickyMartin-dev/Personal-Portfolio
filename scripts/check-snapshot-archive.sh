#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/project-snapshot-archive.XXXXXX")"
trap 'rm -rf "$TEMP_DIR"' EXIT

helper="$ROOT_DIR/scripts/archive_snapshot.py"
if ! command -v python3 >/dev/null 2>&1; then
  printf 'snapshot archive checks skipped: Python 3 is needed only for the optional archive feature.\n'
  exit 0
fi
project="$TEMP_DIR/sample-project"
vault="$TEMP_DIR/brain"
mkdir -p "$project/.agent-state" "$vault/wiki"
git -C "$project" init -q
cat > "$vault/wiki/index.md" <<'EOF'
# Index

## Sources

- Example source.

## Syntheses

_(none yet)_
EOF
cat > "$vault/wiki/log.md" <<'EOF'
# Log

Append-only.
EOF
cat > "$project/.agent-state/second-brain-checkpoint.md" <<'EOF'
# Checkpoint

Implemented the requested change and verified the focused path.
EOF

first_event="$TEMP_DIR/codex-precompact.json"
cat > "$first_event" <<EOF
{"session_id":"session-a","turn_id":"turn-a","cwd":"$project","hook_event_name":"PreCompact","trigger":"auto"}
EOF
python3 "$helper" --archive-root "$vault" --agent codex --hook-input < "$first_event" >/dev/null
snapshot_count="$(find "$vault/raw/project-snapshots" -type f -name '*.md' | wc -l | tr -d ' ')"
[[ "$snapshot_count" == 1 ]] || { printf 'Codex pre-compaction snapshot missing.\n' >&2; exit 1; }

post_event="$TEMP_DIR/codex-postcompact.json"
cat > "$post_event" <<EOF
{"session_id":"session-a","turn_id":"turn-a","cwd":"$project","hook_event_name":"PostCompact","trigger":"auto"}
EOF
python3 "$helper" --archive-root "$vault" --agent codex --hook-input < "$post_event" >/dev/null
snapshot_count="$(find "$vault/raw/project-snapshots" -type f -name '*.md' | wc -l | tr -d ' ')"
[[ "$snapshot_count" == 1 ]] || { printf 'Codex retry created a duplicate snapshot.\n' >&2; exit 1; }

claude_event="$TEMP_DIR/claude-postcompact.json"
cat > "$claude_event" <<EOF
{"session_id":"session-b","cwd":"$project","hook_event_name":"PostCompact","trigger":"manual","compact_summary":"Claude retained the project outcome and next safe action."}
EOF
python3 "$helper" --archive-root "$vault" --agent claude --hook-input < "$claude_event" >/dev/null
snapshot_count="$(find "$vault/raw/project-snapshots" -type f -name '*.md' | wc -l | tr -d ' ')"
[[ "$snapshot_count" == 2 ]] || { printf 'Claude compact summary was not archived.\n' >&2; exit 1; }
grep -R -qF 'Claude retained the project outcome' "$vault/raw/project-snapshots"
grep -qF 'Project snapshots' "$vault/wiki/index.md"
grep -qF 'raw/project-snapshots/' "$vault/wiki/index.md"
grep -qF 'snapshot-id:' "$vault/wiki/log.md"

second_claude_event="$TEMP_DIR/claude-second-compact.json"
cat > "$second_claude_event" <<EOF
{"session_id":"session-b","cwd":"$project","hook_event_name":"PostCompact","trigger":"auto","compact_summary":"A later Claude compaction preserved additional decisions."}
EOF
python3 "$helper" --archive-root "$vault" --agent claude --hook-input < "$second_claude_event" >/dev/null
snapshot_count="$(find "$vault/raw/project-snapshots" -type f -name '*.md' | wc -l | tr -d ' ')"
[[ "$snapshot_count" == 3 ]] || { printf 'A later Claude compaction was not archived separately.\n' >&2; exit 1; }

aws_key="AKIA"'1234567890ABCDEF'
aws_session_key="ASIA"'1234567890ABCDEF'
github_pat='github_pat_'"01234567890123456789"
slack_token='xoxb-'"12345678901234567890"
api_key='sk-'"proj-abcdefghijklmnopqrstuvwxyz1234"
private_key_kind='PRIVATE KEY'
encrypted_key_kind='ENCRYPTED PRIVATE KEY'
private_key_body='PRIVATE_KEY_BODY_SHOULD_NOT_SURVIVE'
encrypted_key_body='ENCRYPTED_KEY_BODY_SHOULD_NOT_SURVIVE'
secret_bundle="AWS $aws_key $aws_session_key GitHub $github_pat Slack $slack_token API $api_key
-----BEGIN $private_key_kind-----
$private_key_body
-----END $private_key_kind-----
-----BEGIN $encrypted_key_kind-----
$encrypted_key_body
-----END $encrypted_key_kind-----"
python3 "$helper" --archive-root "$vault" --project-dir "$project" --agent codex --kind task --summary "$secret_bundle" >/dev/null
for secret in "$aws_key" "$aws_session_key" "$github_pat" "$slack_token" "$api_key" "$private_key_body" "$encrypted_key_body"; do
  if grep -R -qF "$secret" "$vault/raw/project-snapshots"; then
    printf 'snapshot secret redaction failed for a supported credential pattern.\n' >&2
    exit 1
  fi
done
grep -R -qF '[REDACTED-AWS-KEY]' "$vault/raw/project-snapshots"
grep -R -qF '[REDACTED-AWS-SESSION-KEY]' "$vault/raw/project-snapshots"
grep -R -qF '[REDACTED-SLACK-TOKEN]' "$vault/raw/project-snapshots"
grep -R -qF '[REDACTED-PRIVATE-KEY]' "$vault/raw/project-snapshots"

broken_archive="$TEMP_DIR/not-a-vault"
printf 'file blocks vault directory creation\n' > "$broken_archive"
failure_output="$(python3 "$helper" --archive-root "$broken_archive" --agent codex --hook-input < "$first_event" 2>&1)"
grep -qF 'snapshot archive warning:' <<<"$failure_output"
grep -qF 'Continue working' <<<"$failure_output"
[[ -f "$project/.agent-state/second-brain-archive-warning.md" ]] || { printf 'Archive failure warning marker missing.\n' >&2; exit 1; }

unset PROJECT_SNAPSHOT_ARCHIVE_ROOT || true
disabled_output="$("$ROOT_DIR/scripts/project" archive-snapshot --summary 'not archived by default')"
grep -qF 'disabled' <<<"$disabled_output"

printf 'snapshot archive checks passed.\n'
