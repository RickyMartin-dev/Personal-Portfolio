from datetime import datetime, timezone
from decimal import Decimal

from src.weekly_report import previous_week, render_email


def test_previous_week_uses_monday_local_boundaries_and_handles_dst():
    start, end = previous_week(datetime(2026, 3, 9, 12, tzinfo=timezone.utc))

    assert start.isoformat() == "2026-03-02T05:00:00+00:00"
    assert end.isoformat() == "2026-03-09T04:00:00+00:00"


def test_weekly_email_is_plain_text_and_labels_account_wide_cost():
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
    }

    subject, body = render_email(start, end, metrics, Decimal("0.1234"), [("Amazon Bedrock", Decimal("0.1234"))])

    assert "Nov 2–Nov 8, 2026" in subject
    assert "5 (4 successful, 1 other outcomes)" in body
    assert "120 input / 60 output" in body
    assert "${account_cost" not in body
    assert "Costs are account-wide" in body
    assert "RAG searches: 2 (5 retrieved passages)" in body
    assert "<html>" not in body
