"""Bedrock Runtime client factory and invocation error type."""

from __future__ import annotations

from functools import lru_cache

import boto3
from botocore.config import Config

from src.config import BEDROCK_REGION


class BedrockServiceError(RuntimeError):
    """Raised when Bedrock inference or safety checks cannot complete."""


@lru_cache(maxsize=1)
def get_bedrock_client():
    """Use bearer-token credentials locally or the Lambda execution role in AWS."""
    return boto3.client(
        "bedrock-runtime",
        region_name=BEDROCK_REGION,
        config=Config(
            connect_timeout=3,
            read_timeout=24,
            retries={"mode": "standard", "max_attempts": 1},
        ),
    )
