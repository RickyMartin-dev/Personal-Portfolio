from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from src import rag_reindex, retrieval
from src.agent import ChatAgent


RETRIEVAL_REFERENCE_SET = json.loads(
    (Path(__file__).parent / "fixtures" / "rag-retrieval-reference.json").read_text(
        encoding="utf-8"
    )
)


class FakeKnowledgeBaseClient:
    def __init__(self, results: list[dict[str, Any]] | None = None) -> None:
        self.results = results or []
        self.calls: list[dict[str, Any]] = []

    def retrieve(self, **kwargs: Any) -> dict[str, Any]:
        self.calls.append(kwargs)
        return {"retrievalResults": self.results}


def safe_result() -> dict[str, Any]:
    return {
        "results": {
            "contentFilter": {"results": [{"category": "MISCONDUCT", "severityScore": 0.0}]},
            "promptAttack": {"results": [{"category": "PROMPT_INJECTION", "severityScore": 0.0}]},
        },
        "usage": {"contentFilter": {"textUnits": 1}, "promptAttack": {"textUnits": 1}},
    }


def test_retrieval_is_disabled_without_a_knowledge_base() -> None:
    client = FakeKnowledgeBaseClient()

    assert retrieval.retrieve_portfolio_documents("resume", knowledge_base_id="", client=client) == []
    assert client.calls == []


def test_retrieval_returns_bounded_text_and_only_source_filename() -> None:
    client = FakeKnowledgeBaseClient(
        [
            {
                "content": {"text": "x" * 1_500},
                "location": {"s3Location": {"uri": "s3://private-bucket/documents/ricky-resume.pdf"}},
            }
        ]
    )

    results = retrieval.retrieve_portfolio_documents(
        "resume experience", knowledge_base_id="kb-test", client=client
    )

    assert len(client.calls) == 1
    assert client.calls[0]["retrievalConfiguration"]["vectorSearchConfiguration"]["numberOfResults"] == 4
    assert results == [{"source": "ricky-resume.pdf", "text": "x" * 1_200}]
    assert "private-bucket" not in retrieval.format_retrieval_results(results)


def test_retrieval_rejects_unbounded_queries() -> None:
    with pytest.raises(ValueError):
        retrieval.retrieve_portfolio_documents("x" * 501, knowledge_base_id="kb-test", client=FakeKnowledgeBaseClient())


@pytest.mark.parametrize("scenario", RETRIEVAL_REFERENCE_SET, ids=lambda item: item["name"])
def test_retrieval_reference_set_preserves_expected_ranked_sources(
    scenario: dict[str, Any],
) -> None:
    client = FakeKnowledgeBaseClient(scenario["retrieval_results"])

    chunks = retrieval.retrieve_portfolio_documents(
        scenario["query"], knowledge_base_id="kb-test", client=client
    )

    assert [chunk["source"] for chunk in chunks] == scenario["expected_sources"]
    assert client.calls[0]["retrievalQuery"]["text"] == scenario["query"]


class ToolUsingBedrockClient:
    def __init__(self) -> None:
        self.safety_calls: list[dict[str, Any]] = []
        self.converse_calls: list[dict[str, Any]] = []

    def invoke_guardrail_checks(self, **kwargs: Any) -> dict[str, Any]:
        self.safety_calls.append(kwargs)
        return safe_result()

    def converse(self, **kwargs: Any) -> dict[str, Any]:
        self.converse_calls.append(kwargs)
        if len(self.converse_calls) == 1:
            return {
                "stopReason": "tool_use",
                "output": {
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "toolUse": {
                                    "toolUseId": "tooluse-1",
                                    "name": "search_portfolio_documents",
                                    "input": {"query": "resume projects"},
                                }
                            }
                        ],
                    }
                },
            }
        return {
            "stopReason": "end_turn",
            "output": {"message": {"content": [{"text": "The resume lists a forecasting project (ricky-resume.pdf)."}]}},
            "usage": {"inputTokens": 60, "outputTokens": 16},
        }


def test_agent_calls_rag_tool_only_when_model_selects_it_and_checks_final_answer() -> None:
    bedrock = ToolUsingBedrockClient()
    searched: list[str] = []

    def retrieve(query: str) -> list[dict[str, str]]:
        searched.append(query)
        return [{"source": "ricky-resume.pdf", "text": "Led a forecasting project."}]

    result = ChatAgent(
        client_provider=lambda: bedrock,
        retrieval_provider=retrieve,
        knowledge_base_id="kb-test",
    ).chat("What projects are in my resume?")

    assert result["message"].startswith("The resume lists")
    assert searched == ["resume projects"]
    assert len(bedrock.converse_calls) == 2
    assert "toolConfig" in bedrock.converse_calls[0]
    assert "toolConfig" not in bedrock.converse_calls[1]
    tool_result = bedrock.converse_calls[1]["messages"][-1]["content"][0]["toolResult"]
    assert tool_result["toolUseId"] == "tooluse-1"
    assert "ricky-resume.pdf" in tool_result["content"][0]["text"]
    assert len(bedrock.safety_calls) == 2
    assert result["rag_searches"] == 1
    assert result["rag_results_count"] == 1


class FakeIngestionClient:
    def __init__(self, status: str = "COMPLETE") -> None:
        self.status = status
        self.start_calls: list[dict[str, Any]] = []

    def start_ingestion_job(self, **kwargs: Any) -> dict[str, Any]:
        self.start_calls.append(kwargs)
        return {"ingestionJob": {"ingestionJobId": "job-test", "status": self.status}}

    def get_ingestion_job(self, **_kwargs: Any) -> dict[str, Any]:
        return {"ingestionJob": {"ingestionJobId": "job-test", "status": self.status}}


def test_s3_batch_starts_one_sync_for_all_upload_events(monkeypatch) -> None:
    client = FakeIngestionClient()
    monkeypatch.setattr(rag_reindex, "KNOWLEDGE_BASE_ID", "kb-test")
    monkeypatch.setattr(rag_reindex, "DATA_SOURCE_ID", "source-test")
    monkeypatch.setattr(rag_reindex, "_client", lambda: client)
    event = {
        "Records": [
            {"messageId": "message-1", "body": '{"Records":[{"eventName":"ObjectCreated:Put"}]}'},
            {"messageId": "message-2", "body": '{"Records":[{"eventName":"ObjectRemoved:Delete"}]}'},
        ]
    }

    result = rag_reindex.handler(event, None)

    assert result == {"batchItemFailures": []}
    assert len(client.start_calls) == 1
    assert client.start_calls[0]["knowledgeBaseId"] == "kb-test"
    assert len(client.start_calls[0]["clientToken"]) >= 33


def test_failed_sync_returns_batch_for_bounded_sqs_retry(monkeypatch) -> None:
    client = FakeIngestionClient(status="FAILED")
    monkeypatch.setattr(rag_reindex, "KNOWLEDGE_BASE_ID", "kb-test")
    monkeypatch.setattr(rag_reindex, "DATA_SOURCE_ID", "source-test")
    monkeypatch.setattr(rag_reindex, "_client", lambda: client)
    event = {"Records": [{"messageId": "message-1", "body": '{"Records":[]}'}]}

    result = rag_reindex.handler(event, None)

    assert result == {"batchItemFailures": [{"itemIdentifier": "message-1"}]}
