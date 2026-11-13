# Future RAG and S3 reindex plan

**Status:** future scope. V0 does not create a document bucket, vector index, queue, or persistent conversation store.

## Goal

Allow the portfolio owner to upload or replace a knowledge file in one private S3 prefix. Any create, overwrite, or delete in that prefix should trigger a full corpus reindex so the public assistant answers from the latest documents. The eventual agent may add a Pydantic AI flow around the current LangGraph runtime, retrieval citations, and short-lived conversation context.

## Proposed flow

```text
Private S3 bucket / portfolio-docs/
  └─ ObjectCreated and ObjectRemoved events
       └─ SQS work queue with a dead-letter queue
            └─ Debounced, idempotent reindex worker
                 ├─ Read the allowlisted corpus
                 ├─ Parse, chunk, embed, and validate a complete new index
                 └─ Atomically switch the active index version
                      └─ LangGraph retrieval node → answer with source references
```

SQS buffers repeated uploads and retries failed indexing without making S3 events directly invoke a long-running worker. The worker should coalesce a short burst of file events into one reindex job. Each event is only a trigger; the worker reads the current complete prefix so out-of-order and duplicate events still converge on the latest corpus. Store an event manifest with object key, version ID, checksum, index version, and status; do not store message text.

Build an index into a new versioned location, validate it, then switch one small active-version pointer. Failed parses or embedding calls leave the previous index active. A delete event also triggers the complete rebuild, which removes deleted content. S3 notifications must exclude the index-output prefix to prevent an event loop.

## Storage and cost choices

- Begin with one private S3 bucket and a narrow source prefix, for example `portfolio-docs/`. Block public access, use encryption, and restrict uploads to the owner. Do not provision it until the corpus and indexing format exist.
- Set explicit per-file and total corpus size limits before accepting documents. Allow only selected types (initially PDF, Markdown, and text); record rejected-file reasons without retaining file contents in logs.
- Choose the vector store after measuring corpus size and query volume. For a small portfolio corpus, benchmark an index file in S3 loaded by the Lambda container against a managed vector database before choosing a service with idle cost.
- Set lifecycle rules for old index generations and queue DLQ retention. Keep only a small rollback window, then delete stale index outputs.
- Use the existing account budget alerts and add an ingestion batch/corpus-size cap. A request or job count is not a dollar guarantee; monitor measured embedding and model usage.

## Agent and temporary history

Keep the public API stateless at first. Retrieval returns bounded chunks with source names/locations; the answer should cite those sources and clearly say when the corpus does not support an answer. Add a Pydantic AI flow only for a specific typed decision boundary, with LangGraph remaining the explicit orchestration graph.

If cross-request history becomes necessary, use short-lived session state with a short TTL and a hard size limit. Do not put conversations in the S3 document bucket, vector index, ingestion logs, analytics events, or permanent checkpoints. A visitor must not be able to read another visitor's temporary state.

## Security and reliability checks

- Validate owner-only upload permissions, file size, type, checksum, and encryption at the S3 boundary.
- Give the ingestion role read access only to the source prefix and write access only to the index prefix; give the chatbot role read-only access to the active index.
- Treat document contents as untrusted evidence, never as agent instructions. Delimit retrieved text and test prompt injection contained in a document.
- Make the job idempotent; cap concurrent reindexes; retry bounded transient failures; alert on DLQ messages and stale index age.
- Never log raw document text, prompts, or generated answers. Record object version/checksum, job ID, counts, duration, and status.

## Acceptance criteria before implementation

1. Uploading, replacing, and deleting a file in the monitored prefix produces one convergent full-corpus index version.
2. Duplicate or out-of-order events do not publish stale or partial indexes.
3. A failed parse/embedding run leaves the last-known-good index active and can be retried safely.
4. Answers include source references, respect existing message and output limits, and fall back when evidence is missing.
5. Temporary context expires automatically and no raw conversation text is retained in logs or the document index.
6. Terraform plan, per-service cost estimate, budget controls, and mocked ingestion/RAG tests are reviewed before the bucket trigger is enabled.
