"""Structured logging that deliberately excludes chat content."""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone


_SAFE_FIELDS = (
    "event",
    "request_id",
    "outcome",
    "http_status",
    "model_id",
    "latency_ms",
    "input_tokens",
    "output_tokens",
    "guardrail_text_units",
    "error_type",
)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for field in _SAFE_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                entry[field] = value
        return json.dumps(entry, separators=(",", ":"))


def configure_logging() -> None:
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        root_logger.addHandler(logging.StreamHandler(sys.stdout))
    for handler in root_logger.handlers:
        handler.setFormatter(JsonFormatter())
    root_logger.setLevel(logging.INFO)
