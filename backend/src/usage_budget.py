"""Aggregate monthly request cap for the public portfolio assistant."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Callable

import boto3
from botocore.exceptions import ClientError


class ChatQuotaExceeded(Exception):
    """The configured monthly chat request allowance has been used."""


class UsageBudgetUnavailable(Exception):
    """The shared usage counter cannot safely reserve a request."""


class UsageBudget:
    """Reserve one aggregate count atomically without storing chat content."""

    def __init__(
        self,
        monthly_limit: int = 1000,
        table_name: str = "",
        required: bool = False,
        *,
        client: Any | None = None,
        month_provider: Callable[[], str] | None = None,
    ) -> None:
        if monthly_limit < 1:
            raise ValueError("monthly_limit must be at least 1")
        self.monthly_limit = monthly_limit
        self.table_name = table_name
        self.required = required
        self._client = client
        self._month_provider = month_provider or (
            lambda: datetime.now(timezone.utc).strftime("%Y-%m")
        )
        self._counts: dict[str, int] = {}
        self._lock = Lock()

    @classmethod
    def from_environment(cls) -> "UsageBudget":
        try:
            monthly_limit = int(os.getenv("MONTHLY_CHAT_LIMIT", "1000"))
        except ValueError as error:
            raise ValueError("MONTHLY_CHAT_LIMIT must be an integer") from error
        return cls(
            monthly_limit=monthly_limit,
            table_name=os.getenv("USAGE_TABLE_NAME", "").strip(),
            required=os.getenv("USAGE_BUDGET_REQUIRED", "false").lower() == "true",
        )

    def reserve(self) -> None:
        month = self._month_provider()
        if not self.table_name:
            if self.required:
                raise UsageBudgetUnavailable("shared usage budget is not configured")
            self._reserve_locally(month)
            return

        try:
            if self._client is None:
                self._client = boto3.client("dynamodb")
            self._client.update_item(
                TableName=self.table_name,
                Key={"month": {"S": month}},
                UpdateExpression="ADD requestCount :one",
                ConditionExpression="attribute_not_exists(requestCount) OR requestCount < :limit",
                ExpressionAttributeValues={
                    ":one": {"N": "1"},
                    ":limit": {"N": str(self.monthly_limit)},
                },
            )
        except ClientError as error:
            code = error.response.get("Error", {}).get("Code")
            if code == "ConditionalCheckFailedException":
                raise ChatQuotaExceeded from error
            raise UsageBudgetUnavailable from error
        except ChatQuotaExceeded:
            raise
        except Exception as error:
            raise UsageBudgetUnavailable from error

    def _reserve_locally(self, month: str) -> None:
        with self._lock:
            count = self._counts.get(month, 0)
            if count >= self.monthly_limit:
                raise ChatQuotaExceeded
            self._counts[month] = count + 1
