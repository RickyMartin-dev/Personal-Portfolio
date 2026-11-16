"""Send a privacy-safe weekly chatbot usage email."""

from __future__ import annotations

import json
import os
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

import boto3


LOCAL_TZ = ZoneInfo("America/New_York")
LOG_GROUP = os.environ.get("CHATBOT_LOG_GROUP", "/aws/lambda/personal-portfolio-chatbot")
TOPIC_ARN = os.environ.get("REPORT_TOPIC_ARN", "")
REGION = os.environ.get("AWS_REGION", "us-east-1")


def previous_week(now: datetime) -> tuple[datetime, datetime]:
    """Return the previous Monday 00:00 through this Monday 00:00 in New York."""
    local_now = now.astimezone(LOCAL_TZ)
    monday = (local_now - timedelta(days=local_now.weekday())).date()
    end = datetime.combine(monday, time.min, tzinfo=LOCAL_TZ)
    start = end - timedelta(days=7)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def collect_logs(start: datetime, end: datetime) -> dict[str, int | float]:
    logs = boto3.client("logs", region_name=REGION)
    paginator = logs.get_paginator("filter_log_events")
    totals: dict[str, int | float] = {
        "requests": 0,
        "successful": 0,
        "failed": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "guardrail_text_units": 0,
        "rag_searches": 0,
        "rag_results_count": 0,
    }
    latencies: list[int] = []
    for page in paginator.paginate(
        logGroupName=LOG_GROUP,
        startTime=int(start.timestamp() * 1000),
        endTime=int(end.timestamp() * 1000),
    ):
        for event in page.get("events", []):
            try:
                item = json.loads(event["message"])
            except (KeyError, TypeError, json.JSONDecodeError):
                continue
            outcome = item.get("outcome")
            if outcome is None:
                message = item.get("message")
                if isinstance(message, str):
                    try:
                        outcome = json.loads(message).get("outcome")
                    except (json.JSONDecodeError, AttributeError):
                        continue
            if outcome is None:
                continue
            totals["requests"] += 1
            if outcome in {"ok", "success", "completed"}:
                totals["successful"] += 1
            else:
                totals["failed"] += 1
            for name in (
                "input_tokens",
                "output_tokens",
                "guardrail_text_units",
                "rag_searches",
                "rag_results_count",
            ):
                try:
                    totals[name] += int(item.get(name) or 0)
                except (TypeError, ValueError):
                    pass
            try:
                latency = int(item.get("latency_ms"))
                if latency >= 0:
                    latencies.append(latency)
            except (TypeError, ValueError):
                pass
    latencies.sort()
    if latencies:
        totals["average_latency_ms"] = round(sum(latencies) / len(latencies))
        totals["p95_latency_ms"] = latencies[max(0, (95 * len(latencies) + 99) // 100 - 1)]
    else:
        totals["average_latency_ms"] = 0
        totals["p95_latency_ms"] = 0
    return totals


def collect_account_cost(start: datetime, end: datetime) -> tuple[Decimal, list[tuple[str, Decimal]]]:
    # Cost Explorer accepts UTC date boundaries and may update recent costs with a delay.
    ce = boto3.client("ce", region_name="us-east-1")
    paginator = ce.get_paginator("get_cost_and_usage")
    by_service: dict[str, Decimal] = {}
    for page in paginator.paginate(
        TimePeriod={"Start": start.date().isoformat(), "End": end.date().isoformat()},
        Granularity="DAILY",
        Metrics=["UnblendedCost"],
        GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
    ):
        for day in page.get("ResultsByTime", []):
            for group in day.get("Groups", []):
                amount = Decimal(group["Metrics"]["UnblendedCost"]["Amount"])
                by_service[group["Keys"][0]] = by_service.get(group["Keys"][0], Decimal("0")) + amount
    return sum(by_service.values(), Decimal("0")), sorted(by_service.items(), key=lambda pair: pair[1], reverse=True)


def render_email(start: datetime, end: datetime, metrics: dict[str, int | float], account_cost: Decimal, services: list[tuple[str, Decimal]]) -> tuple[str, str]:
    date_label = f"{start.astimezone(LOCAL_TZ):%b %-d}–{(end - timedelta(seconds=1)).astimezone(LOCAL_TZ):%b %-d, %Y}"
    subject = f"Portfolio assistant weekly snapshot · {date_label}"
    services_text = "\n".join(f"  - {name}: ${amount:.4f}" for name, amount in services[:8])
    if not services_text:
        services_text = "  - No cost data returned yet."
    body = f"""Portfolio assistant weekly snapshot
Week: {date_label} (America/New_York)

CHAT USAGE
Requests: {metrics['requests']} ({metrics['successful']} successful, {metrics['failed']} other outcomes)
Tokens: {metrics['input_tokens']:,} input / {metrics['output_tokens']:,} output
Latency: {metrics['average_latency_ms']} ms average / {metrics['p95_latency_ms']} ms p95
Guardrail text units: {metrics['guardrail_text_units']:,}
RAG searches: {metrics['rag_searches']:,} ({metrics['rag_results_count']:,} retrieved passages)

AWS ACCOUNT COST
Total across services: ${account_cost:.4f}
Largest services:
{services_text}

Cost Explorer data can lag by about a day. Costs are account-wide, not attributed exclusively to the chatbot. Chat metrics use privacy-safe operational logs; prompts and replies are not collected."""
    return subject, body


def handler(event: dict, context: object) -> dict[str, str]:
    del event, context
    if not TOPIC_ARN:
        raise RuntimeError("REPORT_TOPIC_ARN is required")
    start, end = previous_week(datetime.now(timezone.utc))
    metrics = collect_logs(start, end)
    account_cost, services = collect_account_cost(start, end)
    subject, body = render_email(start, end, metrics, account_cost, services)
    boto3.client("sns", region_name=REGION).publish(
        TopicArn=TOPIC_ARN,
        Subject=subject[:100],
        Message=body,
        MessageStructure="string",
    )
    return {"status": "sent", "requests": str(metrics["requests"])}
