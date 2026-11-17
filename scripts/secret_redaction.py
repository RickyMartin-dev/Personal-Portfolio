#!/usr/bin/env python3
"""Redact common credentials from text before it is written to durable snapshots."""

from __future__ import annotations

import re
import sys
from typing import Any


MAX_SNAPSHOT_CHARS = 64_000
SECRET_PATTERNS = (
    (
        re.compile(
            r"-----BEGIN (?P<key_type>(?:RSA|OPENSSH|EC|PGP|ENCRYPTED )?PRIVATE KEY)-----"
            r".*?-----END (?P=key_type)-----",
            re.S,
        ),
        "[REDACTED-PRIVATE-KEY]",
    ),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "[REDACTED-AWS-KEY]"),
    (re.compile(r"\bASIA[0-9A-Z]{16}\b"), "[REDACTED-AWS-SESSION-KEY]"),
    (re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"), "[REDACTED-GITHUB-TOKEN]"),
    (re.compile(r"\bgithub_pat_[A-Za-z0-9_]{20,}\b"), "[REDACTED-GITHUB-TOKEN]"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"), "[REDACTED-SLACK-TOKEN]"),
    (re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"), "[REDACTED-API-KEY]"),
    (
        re.compile(
            r'''(?i)(?P<prefix>["']?[A-Z0-9_.-]*(?:PASSWORD|PASSWD|SECRET|TOKEN|'''
            r'''API[_-]?KEY|ACCESS[_-]?KEY|PRIVATE[_-]?KEY)[A-Z0-9_.-]*'''
            r'''["']?\s*[:=]\s*["']?)(?P<value>[^\s,"'`}\]]+)'''
        ),
        "assignment",
    ),
    (re.compile(r"(?i)(\bBearer\s+)[A-Za-z0-9._~+/=-]{16,}"), r"\1[REDACTED]"),
)


def safe_text(value: Any) -> str:
    text = str(value or "").replace("\x00", "")
    for pattern, replacement in SECRET_PATTERNS:
        if replacement == "assignment":
            text = pattern.sub(lambda match: f"{match.group('prefix')}[REDACTED]", text)
        else:
            text = pattern.sub(replacement, text)
    if len(text) > MAX_SNAPSHOT_CHARS:
        text = text[:MAX_SNAPSHOT_CHARS].rstrip() + "\n\n[Snapshot truncated at 64,000 characters.]"
    return text.strip()


def main() -> int:
    sys.stdout.write(safe_text(sys.stdin.read()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
