"""Stateless LangGraph orchestration for one bounded chatbot turn."""

from __future__ import annotations

import logging
import math
from time import perf_counter
from typing import Any, Callable, TypedDict

from langgraph.graph import END, START, StateGraph

from src.bedrock import BedrockServiceError, get_bedrock_client
from src.config import (
    BEDROCK_MODEL_ID,
    BLOCKED_MESSAGE,
    GUARDRAIL_BLOCK_THRESHOLD,
    MAX_OUTPUT_CHARS,
    MAX_OUTPUT_TOKENS,
    SYSTEM_PROMPT,
)


logger = logging.getLogger(__name__)

_CONTENT_CATEGORIES = ("VIOLENCE", "HATE", "SEXUAL", "MISCONDUCT", "INSULTS")
_ATTACK_CATEGORIES = ("JAILBREAK", "PROMPT_INJECTION", "PROMPT_LEAKAGE")


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
    ) -> None:
        self._client_provider = client_provider or get_bedrock_client
        self._system_prompt = system_prompt
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
            input_safety = client.invoke_guardrail_checks(
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

            model_response = client.converse(
                modelId=BEDROCK_MODEL_ID,
                system=[{"text": self._system_prompt}],
                messages=messages,
                inferenceConfig={
                    "maxTokens": MAX_OUTPUT_TOKENS,
                    "temperature": 0.3,
                },
            )
            content = model_response["output"]["message"]["content"]
            answer = "".join(
                block["text"] for block in content if isinstance(block, dict) and "text" in block
            ).strip()
            if not answer:
                raise ValueError("Bedrock returned an empty answer")
            if len(answer) > MAX_OUTPUT_CHARS:
                answer = answer[: MAX_OUTPUT_CHARS - 1].rstrip() + "…"

            output_safety = client.invoke_guardrail_checks(
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
            }
        except Exception as error:
            raise BedrockServiceError(type(error).__name__) from error
