"""Coalesce S3 document events and synchronize the Bedrock knowledge base."""

from __future__ import annotations

import json
import logging
import os
import time
import uuid
from typing import Any

import boto3
from botocore.config import Config


logger = logging.getLogger()
logger.setLevel(logging.INFO)

KNOWLEDGE_BASE_ID = os.getenv("KNOWLEDGE_BASE_ID", "")
DATA_SOURCE_ID = os.getenv("DATA_SOURCE_ID", "")
POLL_INTERVAL_SECONDS = 10
MAX_WAIT_SECONDS = 840
TERMINAL_SUCCESS = {"COMPLETE"}
TERMINAL_FAILURE = {"FAILED", "STOPPED"}


def _client() -> Any:
    return boto3.client(
        "bedrock-agent",
        config=Config(
            connect_timeout=3,
            read_timeout=12,
            retries={"mode": "standard", "max_attempts": 2},
        ),
    )


def _batch_client_token(records: list[dict[str, Any]]) -> str:
    message_parts = []
    for record in records:
        attributes = record.get("attributes", {})
        message_parts.append(
            f"{record.get('messageId', '')}:{attributes.get('ApproximateReceiveCount', '1')}"
        )
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "|".join(sorted(message_parts))))


def _sync_batch(client: Any, records: list[dict[str, Any]]) -> None:
    started = client.start_ingestion_job(
        knowledgeBaseId=KNOWLEDGE_BASE_ID,
        dataSourceId=DATA_SOURCE_ID,
        clientToken=_batch_client_token(records),
        description="S3 document create, update, or delete trigger",
    )
    job = started["ingestionJob"]
    job_id = job["ingestionJobId"]
    deadline = time.monotonic() + MAX_WAIT_SECONDS

    while job.get("status") not in TERMINAL_SUCCESS | TERMINAL_FAILURE:
        if time.monotonic() >= deadline:
            raise RuntimeError("Knowledge base sync exceeded the bounded wait window")
        time.sleep(POLL_INTERVAL_SECONDS)
        job = client.get_ingestion_job(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            dataSourceId=DATA_SOURCE_ID,
            ingestionJobId=job_id,
        )["ingestionJob"]

    status = job.get("status", "UNKNOWN")
    stats = job.get("statistics", {})
    logger.info(
        "portfolio.rag_sync_finished",
        extra={
            "event": "portfolio.rag_sync_finished",
            "job_id": job_id,
            "status": status,
            "documents_scanned": int(stats.get("numberOfDocumentsScanned", 0)),
            "documents_indexed": int(
                stats.get("numberOfNewDocumentsIndexed", 0)
                + stats.get("numberOfModifiedDocumentsIndexed", 0)
            ),
            "documents_deleted": int(stats.get("numberOfDocumentsDeleted", 0)),
            "documents_failed": int(stats.get("numberOfDocumentsFailed", 0)),
        },
    )
    if status not in TERMINAL_SUCCESS or int(stats.get("numberOfDocumentsFailed", 0)) > 0:
        raise RuntimeError("Knowledge base sync did not finish successfully")


def handler(event: dict[str, Any], _context: Any) -> dict[str, list[dict[str, str]]]:
    """Start one sync for a coalesced queue batch; retry or DLQ failed batches."""
    records = event.get("Records", [])
    if not isinstance(records, list) or not records:
        return {"batchItemFailures": []}

    invalid_records: list[dict[str, Any]] = []
    valid_records: list[dict[str, Any]] = []
    for record in records:
        try:
            body = json.loads(record.get("body", "{}"))
            if not isinstance(body, dict) or not isinstance(body.get("Records"), list):
                raise ValueError("invalid S3 notification envelope")
            valid_records.append(record)
        except (json.JSONDecodeError, TypeError, ValueError):
            invalid_records.append(record)

    failed_ids = [
        {"itemIdentifier": record.get("messageId", "")}
        for record in invalid_records
        if record.get("messageId")
    ]
    if valid_records:
        try:
            if not KNOWLEDGE_BASE_ID or not DATA_SOURCE_ID:
                raise RuntimeError("Knowledge base identifiers are not configured")
            _sync_batch(_client(), valid_records)
        except Exception as error:
            logger.error(
                "portfolio.rag_sync_failed",
                extra={"event": "portfolio.rag_sync_failed", "error_type": type(error).__name__},
            )
            failed_ids.extend(
                {"itemIdentifier": record.get("messageId", "")}
                for record in valid_records
                if record.get("messageId")
            )

    return {"batchItemFailures": failed_ids}
