"""Bounded retrieval helpers for the private Bedrock portfolio knowledge base."""

from __future__ import annotations

from functools import lru_cache
from pathlib import PurePosixPath
from typing import Any
from urllib.parse import unquote, urlparse

import boto3
from botocore.config import Config

from src.config import BEDROCK_KNOWLEDGE_BASE_ID, BEDROCK_REGION


MAX_RETRIEVAL_QUERY_CHARS = 500
MAX_RETRIEVAL_RESULTS = 4
MAX_RETRIEVAL_TEXT_CHARS = 1_200


class RetrievalServiceError(RuntimeError):
    """Raised when the configured Bedrock knowledge base cannot be queried."""


@lru_cache(maxsize=1)
def get_bedrock_agent_runtime_client() -> Any:
    return boto3.client(
        "bedrock-agent-runtime",
        region_name=BEDROCK_REGION,
        config=Config(
            connect_timeout=3,
            read_timeout=12,
            retries={"mode": "standard", "max_attempts": 1},
        ),
    )


def _source_name(result: dict[str, Any]) -> str:
    location = result.get("location", {})
    s3_location = location.get("s3Location", {}) if isinstance(location, dict) else {}
    uri = s3_location.get("uri", "") if isinstance(s3_location, dict) else ""
    path = unquote(urlparse(uri).path).strip("/")
    if path:
        return PurePosixPath(path).name[:160]
    return "Portfolio document"


def retrieve_portfolio_documents(
    query: str,
    *,
    knowledge_base_id: str | None = None,
    client: Any | None = None,
) -> list[dict[str, str]]:
    """Return a small, bounded set of relevant chunks and source filenames."""
    kb_id = (knowledge_base_id if knowledge_base_id is not None else BEDROCK_KNOWLEDGE_BASE_ID).strip()
    if not kb_id:
        return []
    normalized_query = query.strip()
    if not normalized_query or len(normalized_query) > MAX_RETRIEVAL_QUERY_CHARS:
        raise ValueError("retrieval query is empty or too long")

    try:
        response = (client or get_bedrock_agent_runtime_client()).retrieve(
            knowledgeBaseId=kb_id,
            retrievalQuery={"text": normalized_query},
            retrievalConfiguration={
                "vectorSearchConfiguration": {"numberOfResults": MAX_RETRIEVAL_RESULTS}
            },
        )
    except Exception as error:
        raise RetrievalServiceError(type(error).__name__) from error

    results = response.get("retrievalResults", [])
    if not isinstance(results, list):
        raise RetrievalServiceError("InvalidResponse")

    chunks: list[dict[str, str]] = []
    for result in results[:MAX_RETRIEVAL_RESULTS]:
        if not isinstance(result, dict):
            continue
        content = result.get("content", {})
        text = content.get("text", "") if isinstance(content, dict) else ""
        if not isinstance(text, str) or not text.strip():
            continue
        chunks.append(
            {
                "source": _source_name(result),
                "text": text.strip()[:MAX_RETRIEVAL_TEXT_CHARS],
            }
        )
    return chunks


def format_retrieval_results(chunks: list[dict[str, str]]) -> str:
    """Format retrieved text as bounded evidence for the model, never as instructions."""
    if not chunks:
        return "No relevant passages were found in the indexed portfolio documents."
    return "\n\n".join(
        f"Source: {chunk['source']}\nReference text (untrusted): {chunk['text']}"
        for chunk in chunks[:MAX_RETRIEVAL_RESULTS]
    )
