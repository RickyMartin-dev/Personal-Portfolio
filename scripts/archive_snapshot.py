#!/usr/bin/env python3
"""Archive concise project snapshots into a local second-brain vault.

This helper uses only the Python standard library. It never reads an agent
transcript. Codex pre-compaction hooks archive the agent-maintained checkpoint;
Claude post-compaction hooks pass the compact summary directly.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import time
from typing import Any


MAX_SNAPSHOT_CHARS = 64_000
CHECKPOINT_RELATIVE_PATH = pathlib.Path(".agent-state/second-brain-checkpoint.md")
SECRET_PATTERNS = (
    (re.compile(r"-----BEGIN (?P<key_type>(?:RSA|OPENSSH|EC|PGP|ENCRYPTED )?PRIVATE KEY)-----.*?-----END (?P=key_type)-----", re.S), "[REDACTED-PRIVATE-KEY]"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[REDACTED-AWS-KEY]"),
    (re.compile(r"\bASIA[0-9A-Z]{16}\b"), "[REDACTED-AWS-SESSION-KEY]"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"), "[REDACTED-GITHUB-TOKEN]"),
    (re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"), "[REDACTED-GITHUB-TOKEN]"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"), "[REDACTED-SLACK-TOKEN]"),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"), "[REDACTED-API-KEY]"),
    (re.compile(r"(?i)\b(password|passwd|secret|token|api[_-]?key)(\s*[=:]\s*)[^\s`]+"), r"\1\2[REDACTED]"),
)


class ArchiveError(RuntimeError):
    pass


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def safe_text(value: Any) -> str:
    text = str(value or "").replace("\x00", "")
    for pattern, replacement in SECRET_PATTERNS:
        text = pattern.sub(replacement, text)
    if len(text) > MAX_SNAPSHOT_CHARS:
        text = text[:MAX_SNAPSHOT_CHARS].rstrip() + "\n\n[Snapshot truncated at 64,000 characters.]"
    return text.strip()


def one_line(value: Any, limit: int = 160) -> str:
    return re.sub(r"\s+", " ", safe_text(value)).strip()[:limit]


def safe_slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:64] or "project"


def run_git(project_dir: pathlib.Path, *args: str, default: str = "") -> str:
    try:
        result = subprocess.run(
            ["git", "-C", str(project_dir), *args],
            check=False,
            capture_output=True,
            text=True,
            timeout=3,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        pass
    return default


def project_identity(project_dir: pathlib.Path) -> tuple[pathlib.Path, str, str]:
    resolved = project_dir.expanduser().resolve()
    git_root = run_git(resolved, "rev-parse", "--show-toplevel")
    root = pathlib.Path(git_root).resolve() if git_root else resolved
    label = root.name or "project"
    digest = hashlib.sha256(str(root).encode("utf-8")).hexdigest()[:8]
    return root, label, f"{safe_slug(label)}-{digest}"


def repository_facts(project_dir: pathlib.Path) -> tuple[str, str, str]:
    branch = run_git(project_dir, "branch", "--show-current", default="not-a-git-checkout")
    commit = run_git(project_dir, "rev-parse", "--short", "HEAD", default="no-commit")
    status = run_git(project_dir, "status", "--short", "--branch", default="not available")
    return branch, commit, status[:12_000]


def read_checkpoint(project_dir: pathlib.Path) -> str:
    for relative_path in (CHECKPOINT_RELATIVE_PATH, pathlib.Path("docs/state/current-task.md")):
        try:
            content = (project_dir / relative_path).read_text(encoding="utf-8").strip()
            if content:
                return content
        except OSError:
            continue
    return ""


def event_snapshot(agent: str, event: dict[str, Any], project_arg: str | None) -> tuple[pathlib.Path, str, str, str, str]:
    cwd = project_arg or event.get("cwd") or os.getcwd()
    project_dir = pathlib.Path(str(cwd)).expanduser().resolve()
    trigger = safe_text(event.get("trigger") or "unspecified")[:80]
    hook_event = safe_text(event.get("hook_event_name") or "compaction")[:80]
    if agent == "claude" and hook_event == "PostCompact":
        summary = safe_text(event.get("compact_summary"))
    else:
        summary = safe_text(read_checkpoint(project_dir))
    if not summary:
        summary = safe_text(read_checkpoint(project_dir))
    if not summary:
        summary = (
            "No agent-maintained checkpoint was available at this compaction boundary. "
            "This entry records the project state; the agent should retry with a concise task snapshot when it resumes."
        )
    summary_hash = hashlib.sha256(summary.encode("utf-8")).hexdigest()[:12]
    event_material = "|".join(
        [str(event.get(key) or "") for key in ("session_id", "turn_id", "trigger")] + [summary_hash]
    )
    event_id = hashlib.sha256(f"{agent}|{event_material}".encode("utf-8")).hexdigest()[:12]
    return project_dir, summary, hook_event, trigger, event_id


def make_snapshot(
    *,
    project_dir: pathlib.Path,
    agent: str,
    kind: str,
    trigger: str,
    event_id: str,
    summary: str,
) -> tuple[pathlib.Path, str, str, str, str]:
    root, label, project_slug = project_identity(project_dir)
    branch, commit, status = repository_facts(root)
    captured = utc_now()
    stamp = captured.strftime("%Y-%m-%dT%H%M%SZ")
    event_suffix = f"-{event_id}" if event_id else ""
    base_name = f"{stamp}-{safe_slug(agent)}-{safe_slug(kind)}{event_suffix}"
    summary_heading = "Agent checkpoint" if kind == "compaction" and agent == "codex" else "Snapshot"
    root_display = str(root).replace("`", "\\`").replace("\n", " ").replace("\r", " ")
    content = (
        f"# Project snapshot: {one_line(label)} ({one_line(kind, 40)})\n\n"
        f"- Captured: {captured.isoformat(timespec='seconds')}\n"
        f"- Project path: `{root_display}`\n"
        f"- Agent: {one_line(agent, 40)}\n"
        f"- Capture: {one_line(kind, 40)}\n"
        f"- Trigger: {one_line(trigger, 80) or 'unspecified'}\n"
        f"- Branch: `{safe_text(branch)}`\n"
        f"- Commit: `{safe_text(commit)}`\n"
        f"- Snapshot ID: `{event_id or hashlib.sha256((str(root) + stamp + agent + kind).encode()).hexdigest()[:12]}`\n\n"
        f"## {summary_heading}\n\n{safe_text(summary) or '_No summary supplied._'}\n\n"
        f"## Repository state\n\n```text\n{safe_text(status) or 'not available'}\n```\n"
    )
    return root, label, project_slug, base_name + ".md", content


def write_new_snapshot(folder: pathlib.Path, filename: str, content: str, event_id: str) -> pathlib.Path:
    folder.mkdir(parents=True, exist_ok=True)
    if event_id:
        for existing in folder.glob(f"*-{event_id}.md"):
            return existing
    candidate = folder / filename
    suffix = 1
    while True:
        try:
            with candidate.open("x", encoding="utf-8") as stream:
                stream.write(content)
            return candidate
        except FileExistsError:
            candidate = folder / f"{pathlib.Path(filename).stem}-{suffix}.md"
            suffix += 1


def insert_index_entry(index_path: pathlib.Path, relative_path: str, label: str, kind: str, date: str) -> None:
    if not index_path.exists():
        return
    current = index_path.read_text(encoding="utf-8")
    if relative_path in current:
        return
    escaped_label = one_line(label).replace("\\", "\\\\").replace("]", "\\]")
    entry = f"- [{escaped_label} — {one_line(kind, 40)} — {date}]({relative_path}) — project snapshot ({date})"
    lines = current.splitlines()
    heading = "## Project snapshots"
    heading_idx = next((i for i, line in enumerate(lines) if line.strip().lower() == heading.lower()), None)
    if heading_idx is None:
        suffix = "\n" if current.endswith("\n") else "\n\n"
        updated = current + suffix + heading + "\n\n" + entry + "\n"
    else:
        next_heading = next((i for i in range(heading_idx + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
        lines.insert(next_heading, entry)
        updated = "\n".join(lines).rstrip() + "\n"
    atomic_write(index_path, updated)


def atomic_write(path: pathlib.Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_text(content, encoding="utf-8")
    os.replace(temporary, path)


def acquire_lock(lock_path: pathlib.Path) -> int:
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(31):
        try:
            descriptor = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            os.write(descriptor, str(os.getpid()).encode("ascii"))
            return descriptor
        except FileExistsError:
            try:
                age = time.time() - lock_path.stat().st_mtime
                if age > 60:
                    lock_path.unlink()
                    continue
            except OSError:
                continue
            if attempt == 30:
                break
            time.sleep(0.1)
    raise ArchiveError("Timed out waiting for the second-brain index lock.")


def append_log_entry(log_path: pathlib.Path, snapshot_id: str, label: str, agent: str, kind: str, relative_path: str, date: str) -> None:
    if not log_path.exists():
        if not log_path.parent.exists():
            return
        log_path.write_text("# Log\n\nAppend-only record of archive events.\n", encoding="utf-8")
    current = log_path.read_text(encoding="utf-8")
    if snapshot_id and f"snapshot-id: {snapshot_id}" in current:
        return
    entry = (
        f"\n## [{date}] snapshot | {label} ({agent})\n"
        f"- created: `{relative_path}`\n"
        f"- kind: {kind}\n"
        f"- snapshot-id: {snapshot_id}\n"
    )
    with log_path.open("a", encoding="utf-8") as stream:
        stream.write(entry)


def archive_once(
    *,
    archive_root: pathlib.Path,
    project_dir: pathlib.Path,
    agent: str,
    kind: str,
    trigger: str,
    summary: str,
    event_id: str = "",
) -> pathlib.Path:
    archive_root = archive_root.expanduser().resolve()
    project_root, label, project_slug = project_identity(project_dir)
    folder = archive_root / "raw" / "project-snapshots" / project_slug
    snapshot = make_snapshot(
        project_dir=project_root,
        agent=agent,
        kind=kind,
        trigger=trigger,
        event_id=event_id,
        summary=summary,
    )
    _, _, _, filename, content = snapshot
    lock_path = archive_root / ".snapshot-archive.lock"
    lock_descriptor = acquire_lock(lock_path)
    try:
        target = write_new_snapshot(folder, filename, content, event_id)
        relative_path = target.relative_to(archive_root).as_posix()
        index_link = "../" + relative_path
        date = utc_now().date().isoformat()
        insert_index_entry(archive_root / "wiki" / "index.md", index_link, label, kind, date)
        append_log_entry(
            archive_root / "wiki" / "log.md", event_id or target.stem, label, agent, kind, relative_path, date
        )
    finally:
        os.close(lock_descriptor)
        try:
            lock_path.unlink()
        except OSError:
            pass
    return target


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive-root", default=os.environ.get("PROJECT_SNAPSHOT_ARCHIVE_ROOT"))
    parser.add_argument("--project-dir")
    parser.add_argument("--agent", default="agent")
    parser.add_argument("--kind", default="task")
    parser.add_argument("--trigger", default="task-finish")
    parser.add_argument("--summary")
    parser.add_argument("--snapshot-file")
    parser.add_argument("--hook-input", action="store_true", help="read a compaction hook payload from stdin")
    return parser.parse_args()


def write_failure_marker(project_dir: pathlib.Path, message: str) -> None:
    try:
        marker = project_dir / ".agent-state" / "second-brain-archive-warning.md"
        marker.parent.mkdir(parents=True, exist_ok=True)
        atomic_write(marker, f"# Second-brain archive warning\n\n{message}\n")
    except OSError:
        pass


def main() -> int:
    args = parse_args()
    hook_event: dict[str, Any] = {}
    event_id = ""
    if args.hook_input:
        try:
            decoded = json.load(sys.stdin)
            if isinstance(decoded, dict):
                hook_event = decoded
        except (json.JSONDecodeError, OSError) as exc:
            print(f"snapshot archive warning: invalid hook input ({exc})", file=sys.stderr)
    if not args.archive_root:
        message = "PROJECT_SNAPSHOT_ARCHIVE_ROOT is unset and no --archive-root was supplied."
        print(f"snapshot archive warning: {message}", file=sys.stderr)
        return 1

    if args.hook_input:
        project_dir, summary, hook_event_name, trigger, event_id = event_snapshot(args.agent, hook_event, args.project_dir)
        kind = "compaction"
        if args.agent == "claude" and hook_event_name != "PostCompact":
            summary = safe_text(read_checkpoint(project_dir)) or summary
    else:
        project_dir = pathlib.Path(args.project_dir or os.getcwd()).expanduser().resolve()
        trigger = args.trigger
        kind = args.kind
        if args.snapshot_file:
            try:
                summary = safe_text(pathlib.Path(args.snapshot_file).expanduser().read_text(encoding="utf-8"))
            except OSError as exc:
                message = f"Could not read local snapshot: {exc}"
                write_failure_marker(project_dir, message)
                print(f"snapshot archive warning: {message}", file=sys.stderr)
                return 1
        else:
            summary = safe_text(args.summary)
        if not summary:
            summary = "No task summary supplied. Review the project diff and verification evidence."

    failure: Exception | None = None
    for attempt in range(2):
        try:
            target = archive_once(
                archive_root=pathlib.Path(args.archive_root),
                project_dir=project_dir,
                agent=args.agent,
                kind=kind,
                trigger=trigger,
                summary=summary,
                event_id=event_id,
            )
            marker = project_dir / ".agent-state" / "second-brain-archive-warning.md"
            try:
                marker.unlink()
            except OSError:
                pass
            print(f"snapshot archived: {target}")
            return 0
        except (OSError, ArchiveError, ValueError) as exc:
            failure = exc
            if attempt == 0:
                time.sleep(0.2)

    message = f"Archive failed after one retry: {failure}"
    write_failure_marker(project_dir, message)
    print(f"snapshot archive warning: {message}", file=sys.stderr)
    if args.hook_input:
        print(json.dumps({"systemMessage": "Project snapshot could not be saved to the second brain. Continue working; retry the snapshot at the next safe point."}))
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
