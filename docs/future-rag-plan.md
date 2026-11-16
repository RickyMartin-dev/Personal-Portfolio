# Portfolio document search (RAG)

**Status:** implemented in application and Terraform source. AWS resources are created by the next approved deployment. The live service will use this index only after that deployment succeeds and documents are uploaded.

## Upload location

Terraform creates a private S3 source bucket. Upload files only to its `documents/` prefix. After deployment, get the exact S3 URI from the Terraform output named `rag_documents_s3_uri` (or `rag_documents_bucket_name` for the bucket name).

Keep uploads to information appropriate for any portfolio visitor: an approved resume/CV, current-work summaries, and research or publication documents. The bucket is private, but the public assistant can quote relevant retrieved passages.

PDF, Word, Markdown, HTML, CSV, and plain-text documents are supported by the standard Bedrock S3 data source. Keep each file within the [Bedrock Knowledge Bases ingestion quota](https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html). Unsupported or unreadable files appear as failed documents in the knowledge base sync history.

## Indexing and retrieval flow

```text
S3 documents/ upload, overwrite, or delete
  → S3 notification
  → SQS queue (batches a short upload burst; retries and DLQ)
  → reindex Lambda
  → Bedrock Knowledge Base S3 data source sync
  → Titan Text Embeddings v2, 300-token chunks with 20% overlap
  → S3 Vectors index
  → agent's search_portfolio_documents tool, only when the model selects it
```

Bedrock scans the configured prefix on a sync and incrementally processes changed files and removals. The queue coalesces notifications for up to 60 seconds and limits indexing worker concurrency. If Bedrock reports an overlapping sync, the queue retries that batch. Other failed syncs retry through SQS up to five times and then go to the dead-letter queue. Check Amazon Bedrock → Knowledge Bases → the portfolio data source → Sync history for per-document results. Redrive messages after fixing a failed upload.

The vector index is Amazon S3 Vectors, with Amazon Bedrock Knowledge Bases managing parsing, chunking, embeddings, and vector writes. This avoids a continuously provisioned vector database. The agent can answer from curated profile facts without retrieval; for document-level details, it can call the bounded search tool, receive up to four short passages, and name the source file. The prompt tells it that the index contains approved resume/CV, current-work, and research material, and that retrieved text is evidence rather than instructions.

## History and privacy

Chat history is temporary and browser-only. The page sends at most two recent exchanges with the next message; closing or reloading the page clears the history. No conversation text is stored in S3, the vector index, DynamoDB, or application logs.

The weekly owner report includes counts of RAG searches and retrieved passages along with chat outcomes, token totals, latency, guardrail units, and account-wide AWS costs. It does not contain document names or text, prompts, or replies.

## Cost and security notes

S3 source storage, S3 Vectors storage/queries, Bedrock embeddings during indexing, and Bedrock Knowledge Bases retrieval are usage-based. The account budget emails warnings but does not shut services off. Uploading and indexing documents and calling RAG can add charges; a budget alert is not a hard cap. There are no provisioned vector nodes.

Only the chatbot Lambda role can retrieve from the knowledge base. The Bedrock service role can read the source prefix and write the S3 Vectors index. The reindex Lambda can start and check ingestion jobs and consume the SQS queue. The website receives no AWS credentials. Retrieved document text is bounded before it is sent to the model, and document contents never enter logs.

Before using the index, finish the GitHub `aws-production` environment and owner-only `develop` ruleset setup, apply the bootstrap role policy, merge the implementation, approve deployment, and upload an initial approved document. The deployment creates an empty index; Terraform does not upload documents or make embedding calls.
