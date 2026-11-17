"""Per-source fixed-window request limiter for the public chat route."""

from __future__ import annotations

import hashlib
import os
import time
from typing import Any, Callable

import boto3
from botocore.exceptions import ClientError


class CallerRateLimitExceeded(Exception):
    """The source has reached the chat request limit for the current window."""


class CallerRateLimitUnavailable(Exception):
    """The shared per-source rate limiter cannot safely check a request."""


class CallerRateLimiter:
    """Store only a short-lived digest of a source address and a request count."""

    def __init__(
        self,
        *,
        table_name: str = "",
        requests_per_window: int = 10,
        window_seconds: int = 60,
        required: bool = False,
        client: Any | None = None,
        epoch_provider: Callable[[], int] | None = None,
    ) -> None:
        if requests_per_window < 1 or window_seconds < 1:
            raise ValueError("rate limit and window must be positive")
        self.table_name = table_name
        self.requests_per_window = requests_per_window
        self.window_seconds = window_seconds
        self.required = required
        self._client = client
        self._epoch_provider = epoch_provider or (lambda: int(time.time()))

    @classmethod
    def from_environment(cls) -> "CallerRateLimiter":
        try:
            limit = int(os.getenv("CHAT_RATE_LIMIT", "10"))
            window = int(os.getenv("CHAT_RATE_WINDOW_SECONDS", "60"))
        except ValueError as error:
            raise ValueError("chat rate-limit settings must be integers") from error
        return cls(
            table_name=os.getenv("CHAT_RATE_LIMIT_TABLE_NAME", "").strip(),
            requests_per_window=limit,
            window_seconds=window,
            required=os.getenv("CHAT_RATE_LIMIT_REQUIRED", "false").lower() == "true",
        )

    def reserve(self, source_address: str | None) -> None:
        if not self.table_name:
            if self.required:
                raise CallerRateLimitUnavailable("shared caller rate limiter is not configured")
            return

        epoch = self._epoch_provider()
        window_start = epoch - epoch % self.window_seconds
        # Do not persist raw IP addresses. The short-lived digest is only a quota key.
        source_digest = hashlib.sha256((source_address or "unknown").encode("utf-8")).hexdigest()
        key = f"{window_start}#{source_digest}"
        expires_at = window_start + (2 * self.window_seconds)

        try:
            if self._client is None:
                self._client = boto3.client("dynamodb")
            self._client.update_item(
                TableName=self.table_name,
                Key={"callerWindow": {"S": key}},
                UpdateExpression="SET expiresAt = if_not_exists(expiresAt, :ttl) ADD requestCount :one",
                ConditionExpression=(
                    "attribute_not_exists(requestCount) OR requestCount < :limit"
                ),
                ExpressionAttributeValues={
                    ":ttl": {"N": str(expires_at)},
                    ":one": {"N": "1"},
                    ":limit": {"N": str(self.requests_per_window)},
                },
            )
        except ClientError as error:
            code = error.response.get("Error", {}).get("Code")
            if code == "ConditionalCheckFailedException":
                raise CallerRateLimitExceeded from error
            raise CallerRateLimitUnavailable from error
        except Exception as error:
            raise CallerRateLimitUnavailable from error
