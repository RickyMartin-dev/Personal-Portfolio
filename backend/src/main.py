"""FastAPI entry point for local use and AWS Lambda."""

from __future__ import annotations

import logging
import uuid
from time import perf_counter
from typing import Literal

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator
from typing_extensions import Annotated

from src.agent import ChatAgent
from src.abuse_limit import (
    CallerRateLimitExceeded,
    CallerRateLimiter,
    CallerRateLimitUnavailable,
)
from src.bedrock import BedrockServiceError
from src.config import (
    ALLOWED_ORIGINS,
    BEDROCK_MODEL_ID,
    MAX_HISTORY_MESSAGE_CHARS,
    MAX_HISTORY_MESSAGES,
    MAX_HISTORY_TOTAL_CHARS,
    MAX_INPUT_CHARS,
    MAX_CHAT_BODY_BYTES,
    SERVICE_UNAVAILABLE_MESSAGE,
)
from src.logging_config import configure_logging
from src.usage_budget import ChatQuotaExceeded, UsageBudget, UsageBudgetUnavailable


configure_logging()
logger = logging.getLogger("chatbot.api")
app = FastAPI(title="Portfolio Chatbot API", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_ORIGINS),
    allow_methods=["GET", "POST"],
    allow_headers=["content-type"],
)


ChatInputText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_INPUT_CHARS),
]


class HistoryMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: Annotated[str, StringConstraints(min_length=1, max_length=MAX_HISTORY_MESSAGE_CHARS)]


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    input: ChatInputText
    history: list[HistoryMessage] = Field(default_factory=list, max_length=MAX_HISTORY_MESSAGES)

    @model_validator(mode="after")
    def validate_history_budget(self) -> "ChatRequest":
        total_chars = sum(len(message.content) for message in self.history)
        if total_chars > MAX_HISTORY_TOTAL_CHARS:
            raise ValueError("history is too large")
        if any(
            message.role == "user" and len(message.content) > MAX_INPUT_CHARS
            for message in self.history
        ):
            raise ValueError("user history message is too large")
        for previous, current in zip(self.history, self.history[1:]):
            if previous.role == current.role:
                raise ValueError("history roles must alternate")
        if self.history and self.history[-1].role != "assistant":
            raise ValueError("history must end with an assistant response")
        return self


class ChatResponse(BaseModel):
    message: str


agent = ChatAgent()
usage_budget = UsageBudget.from_environment()
caller_rate_limiter = CallerRateLimiter.from_environment()


@app.middleware("http")
async def protect_public_chat(request: Request, call_next):
    """Apply abuse and spend controls before FastAPI parses the public payload."""
    if request.method != "POST" or request.url.path != "/chat":
        return await call_next(request)

    request_id = str(uuid.uuid4())
    source_address = request.client.host if request.client else None
    try:
        caller_rate_limiter.reserve(source_address)
    except CallerRateLimitExceeded:
        logger.info(
            "chat.caller_rate_limit_reached",
            extra={"event": "chat.caller_rate_limit_reached", "request_id": request_id, "outcome": "rate_limited", "http_status": 429},
        )
        return JSONResponse(status_code=429, content={"detail": "Too many requests. Please wait before trying again."})
    except CallerRateLimitUnavailable as error:
        logger.error(
            "chat.caller_rate_limiter_unavailable",
            extra={"event": "chat.caller_rate_limiter_unavailable", "request_id": request_id, "outcome": "error", "http_status": 503, "error_type": type(error).__name__},
        )
        return JSONResponse(status_code=503, content={"detail": SERVICE_UNAVAILABLE_MESSAGE})

    try:
        # This reservation also covers malformed and oversized requests so they
        # cannot bypass the aggregate monthly processing ceiling.
        usage_budget.reserve()
    except ChatQuotaExceeded:
        logger.info(
            "chat.monthly_limit_reached",
            extra={"event": "chat.monthly_limit_reached", "request_id": request_id, "outcome": "rate_limited", "http_status": 429},
        )
        return JSONResponse(
            status_code=429,
            content={"detail": "The assistant has reached its monthly request limit."},
        )
    except UsageBudgetUnavailable as error:
        logger.error(
            "chat.usage_budget_unavailable",
            extra={"event": "chat.usage_budget_unavailable", "request_id": request_id, "outcome": "error", "http_status": 503, "error_type": type(error).__name__},
        )
        return JSONResponse(status_code=503, content={"detail": SERVICE_UNAVAILABLE_MESSAGE})

    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_CHAT_BODY_BYTES:
                return JSONResponse(status_code=413, content={"detail": "Chat request is too large."})
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid request."})
    if len(await request.body()) > MAX_CHAT_BODY_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Chat request is too large."})

    return await call_next(request)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request, error: RequestValidationError
) -> JSONResponse:
    # Never reflect invalid request values (which can contain chat text) in errors.
    request_id = str(uuid.uuid4())
    logger.info(
        "chat.invalid_request",
        extra={
            "event": "chat.invalid_request",
            "request_id": request_id,
            "outcome": "invalid_request",
            "http_status": 422,
        },
    )
    return JSONResponse(status_code=422, content={"detail": "Invalid chat request"})


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, request: Request) -> ChatResponse:
    request_id = str(uuid.uuid4())
    started = perf_counter()
    try:
        result = agent.chat(
            user_input=payload.input,
            history=[message.model_dump() for message in payload.history],
            request_id=request_id,
        )
        logger.info(
            "chat.completed",
            extra={
                "event": "chat.completed",
                "request_id": request_id,
                "outcome": result["outcome"],
                "http_status": 200,
                "model_id": BEDROCK_MODEL_ID,
                "latency_ms": round(result["latency_ms"], 1),
                "input_tokens": result["input_tokens"],
                "output_tokens": result["output_tokens"],
                "guardrail_text_units": result["guardrail_text_units"],
                "rag_searches": result.get("rag_searches", 0),
                "rag_results_count": result.get("rag_results_count", 0),
            },
        )
        return ChatResponse(message=result["message"])
    except BedrockServiceError as error:
        logger.error(
            "chat.bedrock_unavailable",
            extra={
                "event": "chat.bedrock_unavailable",
                "request_id": request_id,
                "outcome": "error",
                "http_status": 503,
                "error_type": error.error_type,
                "bedrock_operation": error.operation,
                "model_id": BEDROCK_MODEL_ID,
                "latency_ms": round((perf_counter() - started) * 1000, 1),
            },
        )
        return JSONResponse(
            status_code=503,
            content={"detail": SERVICE_UNAVAILABLE_MESSAGE},
        )
    except Exception as error:
        logger.error(
            "chat.internal_error",
            extra={
                "event": "chat.internal_error",
                "request_id": request_id,
                "outcome": "error",
                "http_status": 500,
                "error_type": type(error).__name__,
                "model_id": BEDROCK_MODEL_ID,
                "latency_ms": round((perf_counter() - started) * 1000, 1),
            },
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "The assistant encountered an unexpected error."},
        )


handler = Mangum(app)
