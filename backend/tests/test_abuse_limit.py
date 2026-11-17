from __future__ import annotations

from botocore.exceptions import ClientError
import pytest

from src.abuse_limit import (
    CallerRateLimitExceeded,
    CallerRateLimiter,
    CallerRateLimitUnavailable,
)


class FakeDynamoDB:
    def __init__(self, error_code: str | None = None) -> None:
        self.error_code = error_code
        self.calls: list[dict] = []

    def update_item(self, **kwargs) -> dict:
        self.calls.append(kwargs)
        if self.error_code:
            raise ClientError({"Error": {"Code": self.error_code}}, "UpdateItem")
        return {}


def test_limiter_uses_a_short_lived_digest_and_atomic_counter() -> None:
    client = FakeDynamoDB()
    limiter = CallerRateLimiter(
        table_name="caller-limits",
        requests_per_window=10,
        window_seconds=60,
        client=client,
        epoch_provider=lambda: 121,
    )

    limiter.reserve("203.0.113.4")

    call = client.calls[0]
    assert call["TableName"] == "caller-limits"
    assert call["Key"]["callerWindow"]["S"].startswith("120#")
    assert "203.0.113.4" not in call["Key"]["callerWindow"]["S"]
    assert call["UpdateExpression"].startswith("SET expiresAt = if_not_exists")
    assert call["ConditionExpression"] == "attribute_not_exists(requestCount) OR requestCount < :limit"
    assert call["ExpressionAttributeValues"][":limit"] == {"N": "10"}
    assert call["ExpressionAttributeValues"][":ttl"] == {"N": "240"}


def test_limiter_maps_threshold_and_store_errors() -> None:
    exceeded = CallerRateLimiter(
        table_name="caller-limits",
        client=FakeDynamoDB("ConditionalCheckFailedException"),
    )
    unavailable = CallerRateLimiter(
        table_name="caller-limits",
        client=FakeDynamoDB("AccessDeniedException"),
    )

    with pytest.raises(CallerRateLimitExceeded):
        exceeded.reserve("203.0.113.4")
    with pytest.raises(CallerRateLimitUnavailable):
        unavailable.reserve("203.0.113.4")


def test_required_limiter_fails_closed_without_a_table() -> None:
    limiter = CallerRateLimiter(required=True)

    with pytest.raises(CallerRateLimitUnavailable):
        limiter.reserve("203.0.113.4")
