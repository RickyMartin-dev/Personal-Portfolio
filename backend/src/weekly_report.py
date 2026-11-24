"""Send a privacy-safe weekly chatbot usage email."""

from __future__ import annotations

import json
import os
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from math import isfinite
from zoneinfo import ZoneInfo

import boto3


LOCAL_TZ = ZoneInfo("America/New_York")
LOG_GROUP = os.environ.get("CHATBOT_LOG_GROUP", "/aws/lambda/personal-portfolio-chatbot")
TOPIC_ARN = os.environ.get("REPORT_TOPIC_ARN", "")
REGION = os.environ.get("AWS_REGION", "us-east-1")
DEFAULT_AGENT_ID = "portfolio_chatbot"
DEFAULT_MODEL_RATES = {
    "us.amazon.nova-micro-v1:0": {
        "input_per_million": 0.035,
        "output_per_million": 0.14,
    }
}


def previous_week(now: datetime) -> tuple[datetime, datetime]:
    """Return the previous Monday 00:00 through this Monday 00:00 in New York."""
    local_now = now.astimezone(LOCAL_TZ)
    monday = (local_now - timedelta(days=local_now.weekday())).date()
    end = datetime.combine(monday, time.min, tzinfo=LOCAL_TZ)
    start = end - timedelta(days=7)
    return start.astimezone(timezone.utc), end.astimezone(timezone.utc)


def _token_count(value: object) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def load_agent_registry() -> dict[str, dict]:
    """Load the explicit allowlist of agent IDs and log groups for this report."""
    raw = os.environ.get("AGENT_REGISTRY_JSON", "").strip()
    if not raw:
        return {
            DEFAULT_AGENT_ID: {
                "display_name": "Personal Portfolio Chatbot",
                "log_group_name": LOG_GROUP,
                "model_rates": DEFAULT_MODEL_RATES,
            }
        }
    try:
        registry = json.loads(raw)
    except json.JSONDecodeError as error:
        raise RuntimeError("AGENT_REGISTRY_JSON must be valid JSON") from error
    if not isinstance(registry, dict) or not registry:
        raise RuntimeError("AGENT_REGISTRY_JSON must be a non-empty object")
    for agent_id, config in registry.items():
        if not isinstance(agent_id, str) or not agent_id or not isinstance(config, dict):
            raise RuntimeError("each report agent must have a stable ID and configuration")
        if not all(isinstance(config.get(field), str) and config[field] for field in ("display_name", "log_group_name")):
            raise RuntimeError(f"agent {agent_id} needs display_name and log_group_name")
        rates = config.get("model_rates")
        if not isinstance(rates, dict):
            raise RuntimeError(f"agent {agent_id} needs a model_rates object")
        for model_id, rate in rates.items():
            if not isinstance(model_id, str) or not isinstance(rate, dict):
                raise RuntimeError(f"agent {agent_id} has an invalid model rate")
            for field in ("input_per_million", "output_per_million"):
                value = rate.get(field)
                if not isinstance(value, (int, float)) or not isfinite(value) or value < 0:
                    raise RuntimeError(f"agent {agent_id} has an invalid {field} rate")
    return registry


def collect_logs(
    start: datetime,
    end: datetime,
    log_group_name: str = LOG_GROUP,
    agent_id: str | None = None,
    include_untagged: bool = False,
) -> dict:
    logs = boto3.client("logs", region_name=REGION)
    paginator = logs.get_paginator("filter_log_events")
    totals = {
        "requests": 0,
        "successful": 0,
        "failed": 0,
        "input_tokens": 0,
        "output_tokens": 0,
        "guardrail_text_units": 0,
        "rag_searches": 0,
        "rag_results_count": 0,
        "models": {},
    }
    latencies: list[int] = []
    for page in paginator.paginate(
        logGroupName=log_group_name,
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
            event_agent_id = item.get("agent_id")
            if agent_id and event_agent_id != agent_id:
                if not (include_untagged and event_agent_id is None):
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
            model_id = item.get("model_id")
            if isinstance(model_id, str) and model_id:
                model_usage = totals["models"].setdefault(
                    model_id, {"input_tokens": 0, "output_tokens": 0}
                )
                model_usage["input_tokens"] += _token_count(item.get("input_tokens"))
                model_usage["output_tokens"] += _token_count(item.get("output_tokens"))
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


def collect_agent_metrics(start: datetime, end: datetime) -> dict[str, dict]:
    registry = load_agent_registry()
    report: dict[str, dict] = {}
    for agent_id, config in sorted(registry.items()):
        metrics = collect_logs(
            start,
            end,
            log_group_name=config["log_group_name"],
            agent_id=agent_id,
            include_untagged=len(registry) == 1,
        )
        estimated_cost = Decimal("0")
        unpriced_models: list[str] = []
        model_details: dict[str, dict] = {}
        for model_id, usage in metrics["models"].items():
            rate = config["model_rates"].get(model_id)
            if rate is None:
                unpriced_models.append(model_id)
                model_details[model_id] = {
                    **usage,
                    "estimated_cost": None,
                }
                continue
            model_cost = (
                Decimal(usage["input_tokens"])
                * Decimal(str(rate["input_per_million"]))
                / Decimal(1_000_000)
            )
            model_cost += (
                Decimal(usage["output_tokens"])
                * Decimal(str(rate["output_per_million"]))
                / Decimal(1_000_000)
            )
            estimated_cost += model_cost
            model_details[model_id] = {
                **usage,
                "estimated_cost": model_cost,
            }
        report[agent_id] = {
            "display_name": config["display_name"],
            "metrics": metrics,
            "estimated_model_cost": estimated_cost,
            "unpriced_models": sorted(unpriced_models),
            "model_details": model_details,
        }
    return report


def collect_account_cost(start: datetime, end: datetime) -> tuple[Decimal, list[tuple[str, Decimal]]]:
    # Cost Explorer accepts UTC date boundaries and may update recent costs with a delay.
    ce = boto3.client("ce", region_name="us-east-1")
    by_service: dict[str, Decimal] = {}
    request = {
        "TimePeriod": {"Start": start.date().isoformat(), "End": end.date().isoformat()},
        "Granularity": "DAILY",
        "Metrics": ["UnblendedCost"],
        "GroupBy": [{"Type": "DIMENSION", "Key": "SERVICE"}],
    }
    while True:
        page = ce.get_cost_and_usage(**request)
        for day in page.get("ResultsByTime", []):
            for group in day.get("Groups", []):
                amount = Decimal(group["Metrics"]["UnblendedCost"]["Amount"])
                by_service[group["Keys"][0]] = by_service.get(group["Keys"][0], Decimal("0")) + amount
        next_page_token = page.get("NextPageToken")
        if not next_page_token:
            break
        request["NextPageToken"] = next_page_token
    return sum(by_service.values(), Decimal("0")), sorted(by_service.items(), key=lambda pair: pair[1], reverse=True)


def render_email(start: datetime, end: datetime, agents: dict[str, dict], account_cost: Decimal, services: list[tuple[str, Decimal]]) -> tuple[str, str]:
    date_label = f"{start.astimezone(LOCAL_TZ):%b %-d}–{(end - timedelta(seconds=1)).astimezone(LOCAL_TZ):%b %-d, %Y}"
    subject = f"Portfolio assistant weekly snapshot · {date_label}"
    services_text = "\n".join(f"  - {name}: ${amount:.4f}" for name, amount in services[:8])
    if not services_text:
        services_text = "  - No cost data returned yet."
    agent_sections = []
    for agent_id, agent in sorted(agents.items()):
        metrics = agent["metrics"]
        cost_note = f"${agent['estimated_model_cost']:.6f} estimated model inference"
        if agent["unpriced_models"]:
            cost_note += f"; unpriced model(s): {', '.join(agent['unpriced_models'])}"
        model_lines = [
            f"    - {model_id}: {usage['input_tokens']:,} input / {usage['output_tokens']:,} output tokens; "
            + (f"${usage['estimated_cost']:.6f}" if usage["estimated_cost"] is not None else "cost unpriced")
            for model_id, usage in sorted(agent["model_details"].items())
        ]
        if not model_lines:
            model_lines = ["    - No model usage recorded."]
        agent_sections.append(
            f"{agent['display_name']} ({agent_id})\n"
            f"  Requests: {metrics['requests']} ({metrics['successful']} successful, {metrics['failed']} other outcomes)\n"
            f"  Tokens: {metrics['input_tokens']:,} input / {metrics['output_tokens']:,} output\n"
            f"  Latency: {metrics['average_latency_ms']} ms average / {metrics['p95_latency_ms']} ms p95\n"
            f"  Guardrail text units: {metrics['guardrail_text_units']:,}; RAG searches: {metrics['rag_searches']:,} ({metrics['rag_results_count']:,} passages)\n"
            f"  Model inference: {cost_note}\n"
            f"  Model detail:\n" + "\n".join(model_lines)
        )
    if not agent_sections:
        agent_sections.append("No agents are registered for this report.")
    agent_text = "\n\n".join(agent_sections)
    all_requests = sum(agent["metrics"]["requests"] for agent in agents.values())
    all_input_tokens = sum(agent["metrics"]["input_tokens"] for agent in agents.values())
    all_output_tokens = sum(agent["metrics"]["output_tokens"] for agent in agents.values())
    all_model_cost = sum(
        (agent["estimated_model_cost"] for agent in agents.values()), Decimal("0")
    )
    body = f"""Portfolio assistant weekly snapshot
Week: {date_label} (America/New_York)

REGISTERED AGENTS OVERVIEW
Agents: {len(agents)}
Requests: {all_requests}
Tokens: {all_input_tokens:,} input / {all_output_tokens:,} output
Estimated model inference: ${all_model_cost:.6f}

AGENT BREAKDOWN
{agent_text}

AWS ACCOUNT COST
Total across services: ${account_cost:.4f}
Largest services:
{services_text}

Model inference amounts are token-based estimates using the configured per-model rate card; unknown model rates are called out above. They exclude shared Lambda, API Gateway, logging, storage, and retrieval infrastructure. Cost Explorer data can lag by about a day; AWS costs above are account-wide and not attributed exclusively to any agent. Chat metrics use privacy-safe operational logs; prompts and replies are not collected."""
    return subject, body


def handler(event: dict, context: object) -> dict[str, str]:
    del event, context
    if not TOPIC_ARN:
        raise RuntimeError("REPORT_TOPIC_ARN is required")
    start, end = previous_week(datetime.now(timezone.utc))
    agents = collect_agent_metrics(start, end)
    account_cost, services = collect_account_cost(start, end)
    subject, body = render_email(start, end, agents, account_cost, services)
    boto3.client("sns", region_name=REGION).publish(
        TopicArn=TOPIC_ARN,
        Subject=subject[:100],
        Message=body,
        MessageStructure="string",
    )
    return {
        "status": "sent",
        "agents": str(len(agents)),
        "requests": str(sum(agent["metrics"]["requests"] for agent in agents.values())),
    }
