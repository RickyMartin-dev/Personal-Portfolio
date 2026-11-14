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
    api_logger = logging.getLogger("chatbot.api")
    api_logger.handlers.clear()
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    handler.setFormatter(JsonFormatter())
    api_logger.addHandler(handler)
    api_logger.setLevel(logging.INFO)
    api_logger.propagate = False
