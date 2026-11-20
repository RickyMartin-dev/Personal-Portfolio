"""Stateless LangGraph orchestration for one bounded chatbot turn."""

from __future__ import annotations

import logging
import math
import re
from time import perf_counter
from typing import Any, Callable, TypedDict

from langgraph.graph import END, START, StateGraph

from src.bedrock import BedrockServiceError, get_bedrock_client
from src.config import (
    BEDROCK_KNOWLEDGE_BASE_ID,
    BEDROCK_MODEL_ID,
    BLOCKED_MESSAGE,
    GUARDRAIL_BLOCK_THRESHOLD,
    MAX_OUTPUT_CHARS,
    MAX_OUTPUT_TOKENS,
    SYSTEM_PROMPT,
)
from src.retrieval import (
    RetrievalServiceError,
    format_retrieval_results,
    retrieve_portfolio_documents,
)


logger = logging.getLogger(__name__)

_CONTENT_CATEGORIES = ("VIOLENCE", "HATE", "SEXUAL", "MISCONDUCT", "INSULTS")
_ATTACK_CATEGORIES = ("JAILBREAK", "PROMPT_INJECTION", "PROMPT_LEAKAGE")
_THINKING_TAG = re.compile(r"<(/?)thinking\b[^>]*>", re.IGNORECASE)
_THINKING_OPEN_START = re.compile(r"<thinking\b", re.IGNORECASE)


class ChatState(TypedDict, total=False):
    input: str
    history: list[dict[str, str]]
    request_id: str
    message: str
    outcome: str
    input_tokens: int
    output_tokens: int
    guardrail_text_units: int
    latency_ms: float
    rag_searches: int
    rag_results_count: int


def _content_checks() -> dict[str, Any]:
    return {
        "contentFilter": {
            "categories": [{"category": category} for category in _CONTENT_CATEGORIES]
        }
    }


def _input_checks() -> dict[str, Any]:
    checks = _content_checks()
    checks["promptAttack"] = {
        "categories": [{"category": category} for category in _ATTACK_CATEGORIES]
    }
    return checks


def _has_blocking_score(
    response: dict[str, Any], threshold: float, expected_checks: tuple[str, ...]
) -> bool:
    """Enforce detect-only Bedrock findings in application code."""
    results = response.get("results")
    if not isinstance(results, dict):
        raise ValueError("Bedrock safety response did not contain results")

    for check_name in expected_checks:
        check_result = results.get(check_name)
        if not isinstance(check_result, dict):
            raise ValueError(f"Bedrock safety response omitted {check_name} results")
        findings = check_result.get("results")
        if not isinstance(findings, list):
            raise ValueError(f"Bedrock safety response had invalid {check_name} results")
        for finding in findings:
            score = finding.get("severityScore")
            if (
                not isinstance(score, (int, float))
                or not math.isfinite(score)
                or not 0 <= score <= 1
            ):
                raise ValueError(f"Bedrock safety response had invalid {check_name} score")
            if score >= threshold:
                return True
    return False


def _text_units(response: dict[str, Any]) -> int:
    usage = response.get("usage", {})
    return sum(
        int(item.get("textUnits", 0))
        for item in usage.values()
        if isinstance(item, dict)
    )


def _public_answer(content: list[Any]) -> str:
    """Return visitor-facing text and discard model-private thinking markup."""
    answer = "".join(
        block["text"]
        for block in content
        if isinstance(block, dict) and isinstance(block.get("text"), str)
    )
    visible: list[str] = []
    cursor = 0
    depth = 0
    for tag in _THINKING_TAG.finditer(answer):
        is_close = bool(tag.group(1))
        if depth == 0:
            visible.append(answer[cursor : tag.start()])
            cursor = tag.end()
            if not is_close:
                depth = 1
        elif is_close:
            depth -= 1
            if depth == 0:
                cursor = tag.end()
        else:
            depth += 1

    if depth == 0:
        tail = answer[cursor:]
        incomplete_open = _THINKING_OPEN_START.search(tail)
        visible.append(tail[: incomplete_open.start()] if incomplete_open else tail)
    return "".join(visible).strip()


def _invoke_bedrock(client: Any, operation: str, **request: Any) -> dict[str, Any]:
    try:
        return getattr(client, operation)(**request)
    except Exception as error:
        raise BedrockServiceError(type(error).__name__, operation) from error


def _bedrock_messages(history: list[dict[str, str]], user_input: str) -> list[dict[str, Any]]:
    messages: list[dict[str, Any]] = []
    # A sliding history may begin with an orphaned assistant message, but
    # Bedrock Converse requires the first message to come from the user.
    if history and history[0]["role"] == "assistant":
        history = history[1:]
    for item in history:
        messages.append(
            {"role": item["role"], "content": [{"text": item["content"]}]}
        )
    messages.append({"role": "user", "content": [{"text": user_input}]})
    return messages


class ChatAgent:
    """Keep no server-side conversation state; the browser supplies bounded history."""

    def __init__(
        self,
        client_provider: Callable[[], Any] | None = None,
        system_prompt: str = SYSTEM_PROMPT,
        retrieval_provider: Callable[[str], list[dict[str, str]]] | None = None,
        knowledge_base_id: str = BEDROCK_KNOWLEDGE_BASE_ID,
    ) -> None:
        self._client_provider = client_provider or get_bedrock_client
        self._system_prompt = system_prompt
        self._retrieval_provider = retrieval_provider or retrieve_portfolio_documents
        self._knowledge_base_id = knowledge_base_id.strip()
        builder = StateGraph(ChatState)
        builder.add_node("respond", self._respond)
        builder.add_edge(START, "respond")
        builder.add_edge("respond", END)
        self._graph = builder.compile()

    def chat(
        self,
        user_input: str,
        history: list[dict[str, str]] | None = None,
        request_id: str = "-",
    ) -> dict[str, Any]:
        return self._graph.invoke(
            {
                "input": user_input,
                "history": history or [],
                "request_id": request_id,
            }
        )

    def _respond(self, state: ChatState) -> dict[str, Any]:
        started = perf_counter()
        history = state.get("history", [])

        try:
            client = self._client_provider()
            messages = _bedrock_messages(history, state["input"])
            safety_messages = [
                {"role": "system", "content": [{"text": self._system_prompt}]},
                *messages,
            ]
            input_safety = _invoke_bedrock(
                client,
                "invoke_guardrail_checks",
                messages=safety_messages,
                checks=_input_checks(),
            )
            safety_units = _text_units(input_safety)
            if _has_blocking_score(
                input_safety,
                GUARDRAIL_BLOCK_THRESHOLD,
                ("contentFilter", "promptAttack"),
            ):
                return {
                    "message": BLOCKED_MESSAGE,
                    "outcome": "blocked_input",
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "guardrail_text_units": safety_units,
                    "latency_ms": (perf_counter() - started) * 1000,
                }

            model_response = self._converse(client, messages)
            rag_searches = 0
            rag_results_count = 0
            if self._knowledge_base_id and model_response.get("stopReason") == "tool_use":
                first_call_usage = model_response.get("usage", {})
                model_response, rag_results_count = self._continue_after_retrieval(
                    client, messages, model_response
                )
                final_call_usage = model_response.get("usage", {})
                model_response["usage"] = {
                    "inputTokens": int(first_call_usage.get("inputTokens", 0))
                    + int(final_call_usage.get("inputTokens", 0)),
                    "outputTokens": int(first_call_usage.get("outputTokens", 0))
                    + int(final_call_usage.get("outputTokens", 0)),
                }
                rag_searches = 1
            content = model_response["output"]["message"]["content"]
            answer = _public_answer(content)
            if not answer:
                raise ValueError("Bedrock returned an empty answer")
            if len(answer) > MAX_OUTPUT_CHARS:
                answer = answer[: MAX_OUTPUT_CHARS - 1].rstrip() + "…"

            output_safety = _invoke_bedrock(
                client,
                "invoke_guardrail_checks",
                messages=[{"role": "assistant", "content": [{"text": answer}]}],
                checks=_content_checks(),
            )
            safety_units += _text_units(output_safety)
            outcome = "ok"
            if _has_blocking_score(
                output_safety,
                GUARDRAIL_BLOCK_THRESHOLD,
                ("contentFilter",),
            ):
                answer = BLOCKED_MESSAGE
                outcome = "blocked_output"

            usage = model_response.get("usage", {})
            return {
                "message": answer,
                "outcome": outcome,
                "input_tokens": int(usage.get("inputTokens", 0)),
                "output_tokens": int(usage.get("outputTokens", 0)),
                "guardrail_text_units": safety_units,
                "latency_ms": (perf_counter() - started) * 1000,
                "rag_searches": rag_searches,
                "rag_results_count": rag_results_count,
            }
        except BedrockServiceError:
            raise
        except Exception as error:
            raise BedrockServiceError(type(error).__name__, "agent_response") from error

    def _converse(
        self, client: Any, messages: list[dict[str, Any]], *, allow_retrieval: bool = True
    ) -> dict[str, Any]:
        request: dict[str, Any] = {
            "modelId": BEDROCK_MODEL_ID,
            "system": [{"text": self._system_prompt}],
            "messages": messages,
            "inferenceConfig": {
                "maxTokens": MAX_OUTPUT_TOKENS,
                "temperature": 0.0 if self._knowledge_base_id and allow_retrieval else 0.3,
            },
        }
        if self._knowledge_base_id and allow_retrieval:
            request["toolConfig"] = {
                "tools": [
                    {
                        "toolSpec": {
                            "name": "search_portfolio_documents",
                            "description": (
                                "Search Ricky's approved resume, current-work notes, and research "
                                "documents. Use for document-specific details not present in the "
                                "curated profile facts."
                            ),
                            "inputSchema": {
                                "json": {
                                    "type": "object",
                                    "properties": {
                                        "query": {
                                            "type": "string",
                                            "description": "A concise search query for the portfolio documents.",
                                        },
                                    },
                                    "required": ["query"],
                                }
                            },
                        }
                    }
                ]
            }
        return _invoke_bedrock(client, "converse", **request)

    def _continue_after_retrieval(
        self,
        client: Any,
        messages: list[dict[str, Any]],
        tool_response: dict[str, Any],
    ) -> tuple[dict[str, Any], int]:
        assistant_message = tool_response.get("output", {}).get("message", {})
        content = assistant_message.get("content", [])
        tool_calls = [
            block["toolUse"]
            for block in content
            if isinstance(block, dict) and isinstance(block.get("toolUse"), dict)
        ]
        if len(tool_calls) != 1 or tool_calls[0].get("name") != "search_portfolio_documents":
            raise ValueError("Bedrock returned an invalid portfolio search request")

        tool_call = tool_calls[0]
        tool_input = tool_call.get("input", {})
        query = tool_input.get("query") if isinstance(tool_input, dict) else None
        if not isinstance(query, str) or not query.strip() or len(query) > 500:
            raise ValueError("Bedrock returned an invalid portfolio search query")

        try:
            results = self._retrieval_provider(query)
            result_text = format_retrieval_results(results)
            result_status = "success"
            result_count = len(results)
        except (RetrievalServiceError, ValueError):
            logger.info("chat.document_search_unavailable")
            result_text = (
                "Document search is temporarily unavailable. Answer only from the curated "
                "portfolio facts and say when you cannot verify a detail."
            )
            result_status = "error"
            result_count = 0

        messages.extend(
            [
                {"role": "assistant", "content": content},
                {
                    "role": "user",
                    "content": [
                        {
                            "toolResult": {
                                "toolUseId": tool_call.get("toolUseId"),
                                "content": [{"text": result_text}],
                                "status": result_status,
                            }
                        }
                    ],
                },
            ]
        )
        return self._converse(client, messages, allow_retrieval=False), result_count
