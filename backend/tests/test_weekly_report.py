import json
import logging
from datetime import datetime, timezone
from decimal import Decimal

from src import weekly_report as weekly_report_module
from src.weekly_report import collect_account_cost
from src.weekly_report import previous_week, render_email
from src.logging_config import JsonFormatter


def test_structured_logs_include_a_stable_agent_id():
    record = logging.LogRecord("chatbot.api", logging.INFO, __file__, 1, "chat.completed", (), None)
    record.agent_id = "vault_agent"

    entry = json.loads(JsonFormatter().format(record))

    assert entry["agent_id"] == "vault_agent"
    assert "prompt" not in entry
    assert "reply" not in entry


def test_previous_week_uses_monday_local_boundaries_and_handles_dst():
    start, end = previous_week(datetime(2026, 3, 9, 12, tzinfo=timezone.utc))

    assert start.isoformat() == "2026-03-02T05:00:00+00:00"
    assert end.isoformat() == "2026-03-09T04:00:00+00:00"


def test_weekly_email_breaks_down_agents_and_labels_estimate_and_account_cost():
    start = datetime(2026, 11, 2, 5, tzinfo=timezone.utc)
    end = datetime(2026, 11, 9, 5, tzinfo=timezone.utc)
    metrics = {
        "requests": 5,
        "successful": 4,
        "failed": 1,
        "input_tokens": 120,
        "output_tokens": 60,
        "average_latency_ms": 810,
        "p95_latency_ms": 1200,
        "guardrail_text_units": 20,
        "rag_searches": 2,
        "rag_results_count": 5,
        "models": {"us.amazon.nova-micro-v1:0": {"input_tokens": 120, "output_tokens": 60}},
    }
    agents = {
        "portfolio_chatbot": {
            "display_name": "Personal Portfolio Chatbot",
            "metrics": metrics,
            "estimated_model_cost": Decimal("0.0000126"),
            "unpriced_models": [],
            "model_details": {
                "us.amazon.nova-micro-v1:0": {
                    "input_tokens": 120,
                    "output_tokens": 60,
                    "estimated_cost": Decimal("0.0000126"),
                }
            },
        }
    }

    subject, body = render_email(start, end, agents, Decimal("0.1234"), [("Amazon Bedrock", Decimal("0.1234"))])

    assert "Nov 2–Nov 8, 2026" in subject
    assert "5 (4 successful, 1 other outcomes)" in body
    assert "120 input / 60 output" in body
    assert "Personal Portfolio Chatbot (portfolio_chatbot)" in body
    assert "Agents: 1" in body
    assert "Requests: 5" in body
    assert "$0.000013 estimated model inference" in body
    assert "us.amazon.nova-micro-v1:0: 120 input / 60 output tokens" in body
    assert "${account_cost" not in body
    assert "AWS costs above are account-wide" in body
    assert "RAG searches: 2 (5 passages)" in body
    assert "<html>" not in body


def test_collect_logs_filters_explicit_agent_id_and_counts_model_tokens(monkeypatch):
    events = [
        {"message": '{"outcome":"ok","agent_id":"portfolio_chatbot","model_id":"model-a","input_tokens":10,"output_tokens":5,"latency_ms":20}'},
        {"message": '{"outcome":"ok","agent_id":"vault_agent","model_id":"model-b","input_tokens":100,"output_tokens":50,"latency_ms":30}'},
    ]

    class LogsPaginator:
        def paginate(self, **request):
            assert request["logGroupName"] == "/aws/lambda/shared-agent-runtime"
            return [{"events": events}]

    class Logs:
        def get_paginator(self, operation):
            assert operation == "filter_log_events"
            return LogsPaginator()

    monkeypatch.setattr(weekly_report_module.boto3, "client", lambda service, region_name: Logs())
    metrics = weekly_report_module.collect_logs(
        datetime(2026, 11, 16, tzinfo=timezone.utc),
        datetime(2026, 11, 23, tzinfo=timezone.utc),
        log_group_name="/aws/lambda/shared-agent-runtime",
        agent_id="portfolio_chatbot",
    )

    assert metrics["requests"] == 1
    assert metrics["input_tokens"] == 10
    assert metrics["output_tokens"] == 5
    assert metrics["models"] == {"model-a": {"input_tokens": 10, "output_tokens": 5}}


def test_collect_agent_metrics_estimates_cost_from_registered_model_rates(monkeypatch):
    monkeypatch.setattr(
        weekly_report_module,
        "load_agent_registry",
        lambda: {
            "portfolio_chatbot": {
                "display_name": "Portfolio Chatbot",
                "log_group_name": "/aws/lambda/portfolio",
                "model_rates": {
                    "model-a": {"input_per_million": 0.035, "output_per_million": 0.14},
                },
            }
        },
    )
    monkeypatch.setattr(
        weekly_report_module,
        "collect_logs",
        lambda *args, **kwargs: {
            "requests": 1,
            "successful": 1,
            "failed": 0,
            "input_tokens": 1000,
            "output_tokens": 1000,
            "average_latency_ms": 10,
            "p95_latency_ms": 10,
            "guardrail_text_units": 0,
            "rag_searches": 0,
            "rag_results_count": 0,
            "models": {"model-a": {"input_tokens": 1000, "output_tokens": 1000}},
        },
    )

    agents = weekly_report_module.collect_agent_metrics(
        datetime(2026, 11, 16, tzinfo=timezone.utc),
        datetime(2026, 11, 23, tzinfo=timezone.utc),
    )

    assert agents["portfolio_chatbot"]["estimated_model_cost"] == Decimal("0.000175")
    assert agents["portfolio_chatbot"]["unpriced_models"] == []
    assert agents["portfolio_chatbot"]["model_details"]["model-a"]["estimated_cost"] == Decimal("0.000175")


def test_collect_account_cost_follows_cost_explorer_next_page_token(monkeypatch):
    class CostExplorer:
        def __init__(self):
            self.requests = []
            self.pages = [
                {
                    "ResultsByTime": [{
                        "Groups": [
                            {"Keys": ["Amazon Bedrock"], "Metrics": {"UnblendedCost": {"Amount": "0.12"}}},
                            {"Keys": ["AWS Lambda"], "Metrics": {"UnblendedCost": {"Amount": "0.03"}}},
                        ]
                    }],
                    "NextPageToken": "page-2",
                },
                {
                    "ResultsByTime": [{
                        "Groups": [
                            {"Keys": ["Amazon Bedrock"], "Metrics": {"UnblendedCost": {"Amount": "0.01"}}},
                            {"Keys": ["Amazon S3"], "Metrics": {"UnblendedCost": {"Amount": "0.02"}}},
                        ]
                    }]
                },
            ]

        def get_cost_and_usage(self, **request):
            self.requests.append(request.copy())
            return self.pages.pop(0)

    client = CostExplorer()
    monkeypatch.setattr(weekly_report_module.boto3, "client", lambda service, region_name: client)
    start = datetime(2026, 11, 16, tzinfo=timezone.utc)
    end = datetime(2026, 11, 23, tzinfo=timezone.utc)

    total, services = collect_account_cost(start, end)

    assert total == Decimal("0.18")
    assert services == [
        ("Amazon Bedrock", Decimal("0.13")),
        ("AWS Lambda", Decimal("0.03")),
        ("Amazon S3", Decimal("0.02")),
    ]
    assert len(client.requests) == 2
    assert client.requests[0]["TimePeriod"] == {"Start": "2026-11-16", "End": "2026-11-23"}
    assert "NextPageToken" not in client.requests[0]
    assert client.requests[1]["NextPageToken"] == "page-2"
