from __future__ import annotations

from botocore.exceptions import ClientError
import pytest

from src.usage_budget import ChatQuotaExceeded, UsageBudget, UsageBudgetUnavailable


class FakeDynamoDB:
    def __init__(self, error_code: str | None = None) -> None:
        self.error_code = error_code
        self.calls: list[dict] = []

    def update_item(self, **kwargs) -> dict:
        self.calls.append(kwargs)
        if self.error_code:
            raise ClientError({"Error": {"Code": self.error_code}}, "UpdateItem")
        return {}


def test_local_budget_stops_at_limit_and_rolls_over_by_month() -> None:
    current_month = ["2026-11"]
    budget = UsageBudget(monthly_limit=2, month_provider=lambda: current_month[0])

    budget.reserve()
    budget.reserve()
    with pytest.raises(ChatQuotaExceeded):
        budget.reserve()

    current_month[0] = "2026-12"
    budget.reserve()


def test_required_budget_fails_closed_without_shared_table() -> None:
    budget = UsageBudget(monthly_limit=1, required=True)

    with pytest.raises(UsageBudgetUnavailable):
        budget.reserve()


def test_dynamodb_counter_uses_atomic_conditional_update() -> None:
    client = FakeDynamoDB()
    budget = UsageBudget(
        monthly_limit=1000,
        table_name="monthly-usage",
        client=client,
        month_provider=lambda: "2026-11",
    )

    budget.reserve()

    assert client.calls == [
        {
            "TableName": "monthly-usage",
            "Key": {"month": {"S": "2026-11"}},
            "UpdateExpression": "ADD requestCount :one",
            "ConditionExpression": "attribute_not_exists(requestCount) OR requestCount < :limit",
            "ExpressionAttributeValues": {
                ":one": {"N": "1"},
                ":limit": {"N": "1000"},
            },
        }
    ]


def test_dynamodb_quota_error_maps_to_limit_and_service_errors_fail_closed() -> None:
    exhausted = UsageBudget(
        table_name="monthly-usage",
        client=FakeDynamoDB("ConditionalCheckFailedException"),
    )
    unavailable = UsageBudget(
        table_name="monthly-usage",
        client=FakeDynamoDB("AccessDeniedException"),
    )

    with pytest.raises(ChatQuotaExceeded):
        exhausted.reserve()
    with pytest.raises(UsageBudgetUnavailable):
        unavailable.reserve()
