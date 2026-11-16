data "aws_iam_policy_document" "rag_knowledge_base_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["bedrock.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:knowledge-base/*"]
    }
  }
}

resource "aws_s3_bucket" "rag_documents" {
  bucket        = "${var.project_name}-rag-${data.aws_caller_identity.current.account_id}"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "rag_documents" {
  bucket = aws_s3_bucket.rag_documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "rag_documents" {
  bucket = aws_s3_bucket.rag_documents.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "rag_documents" {
  bucket = aws_s3_bucket.rag_documents.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "rag_documents" {
  bucket = aws_s3_bucket.rag_documents.id
  rule {
    id     = "abort-incomplete-document-uploads"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3vectors_vector_bucket" "portfolio" {
  vector_bucket_name = "${var.project_name}-rag-vectors-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3vectors_index" "portfolio" {
  index_name         = "portfolio-documents"
  vector_bucket_name = aws_s3vectors_vector_bucket.portfolio.vector_bucket_name
  data_type          = "float32"
  dimension          = 1024
  distance_metric    = "cosine"

  metadata_configuration {
    non_filterable_metadata_keys = ["AMAZON_BEDROCK_TEXT", "AMAZON_BEDROCK_METADATA"]
  }
}

resource "aws_iam_role" "rag_knowledge_base" {
  name               = "${var.project_name}-rag-knowledge-base"
  assume_role_policy = data.aws_iam_policy_document.rag_knowledge_base_assume_role.json
}

data "aws_iam_policy_document" "rag_knowledge_base" {
  statement {
    sid       = "ReadOnlyPortfolioSourceDocuments"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.rag_documents.arn]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["documents/", "documents/*"]
    }
  }

  statement {
    sid       = "ReadPortfolioSourceDocuments"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.rag_documents.arn}/documents/*"]
  }

  statement {
    sid       = "GenerateDocumentEmbeddings"
    actions   = ["bedrock:InvokeModel"]
    resources = ["arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0"]
  }

  statement {
    sid = "ManagePortfolioVectors"
    actions = [
      "s3vectors:PutVectors",
      "s3vectors:GetVectors",
      "s3vectors:DeleteVectors",
      "s3vectors:QueryVectors",
      "s3vectors:GetIndex",
    ]
    resources = [aws_s3vectors_index.portfolio.index_arn]
  }
}

resource "aws_iam_role_policy" "rag_knowledge_base" {
  name   = "${var.project_name}-rag-knowledge-base"
  role   = aws_iam_role.rag_knowledge_base.id
  policy = data.aws_iam_policy_document.rag_knowledge_base.json
}

resource "aws_bedrockagent_knowledge_base" "portfolio" {
  name     = "${var.project_name}-portfolio-documents"
  role_arn = aws_iam_role.rag_knowledge_base.arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = "arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0"
      embedding_model_configuration {
        bedrock_embedding_model_configuration {
          dimensions          = 1024
          embedding_data_type = "FLOAT32"
        }
      }
    }
  }

  storage_configuration {
    type = "S3_VECTORS"
    s3_vectors_configuration {
      index_arn = aws_s3vectors_index.portfolio.index_arn
    }
  }

  depends_on = [aws_iam_role_policy.rag_knowledge_base]
}

resource "aws_bedrockagent_data_source" "portfolio_documents" {
  knowledge_base_id    = aws_bedrockagent_knowledge_base.portfolio.id
  name                 = "portfolio-documents-s3"
  data_deletion_policy = "DELETE"
  description          = "Owner-approved portfolio documents from the documents/ S3 prefix."

  data_source_configuration {
    type = "S3"
    s3_configuration {
      bucket_arn         = aws_s3_bucket.rag_documents.arn
      inclusion_prefixes = ["documents/"]
    }
  }

  vector_ingestion_configuration {
    chunking_configuration {
      chunking_strategy = "FIXED_SIZE"
      fixed_size_chunking_configuration {
        max_tokens         = 300
        overlap_percentage = 20
      }
    }
  }
}

resource "aws_sqs_queue" "rag_ingestion_dlq" {
  name                      = "${var.project_name}-rag-ingestion-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "rag_ingestion" {
  name                       = "${var.project_name}-rag-ingestion"
  message_retention_seconds  = 345600
  visibility_timeout_seconds = 5400
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.rag_ingestion_dlq.arn
    maxReceiveCount     = 5
  })
}

data "aws_iam_policy_document" "rag_ingestion_queue" {
  statement {
    sid       = "AllowOnlyPortfolioBucketNotifications"
    effect    = "Allow"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.rag_ingestion.arn]
    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_s3_bucket.rag_documents.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sqs_queue_policy" "rag_ingestion" {
  queue_url = aws_sqs_queue.rag_ingestion.id
  policy    = data.aws_iam_policy_document.rag_ingestion_queue.json
}

resource "aws_s3_bucket_notification" "rag_documents" {
  bucket = aws_s3_bucket.rag_documents.id
  queue {
    queue_arn     = aws_sqs_queue.rag_ingestion.arn
    events        = ["s3:ObjectCreated:*", "s3:ObjectRemoved:*"]
    filter_prefix = "documents/"
  }
  depends_on = [aws_sqs_queue_policy.rag_ingestion]
}

data "archive_file" "rag_reindex" {
  type        = "zip"
  source_file = "${path.module}/../../src/rag_reindex.py"
  output_path = "${path.module}/.terraform/rag-reindex.zip"
}

resource "aws_cloudwatch_log_group" "rag_reindex" {
  name              = "/aws/lambda/${var.project_name}-rag-reindex"
  retention_in_days = var.log_retention_days
}

data "aws_iam_policy_document" "rag_reindex_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "rag_reindex" {
  name               = "${var.project_name}-rag-reindex"
  assume_role_policy = data.aws_iam_policy_document.rag_reindex_assume_role.json
}

data "aws_iam_policy_document" "rag_reindex" {
  statement {
    sid       = "StartPortfolioDocumentSync"
    actions   = ["bedrock:StartIngestionJob"]
    resources = [aws_bedrockagent_knowledge_base.portfolio.arn]
  }

  statement {
    sid       = "ReadPortfolioSyncStatus"
    actions   = ["bedrock:GetIngestionJob"]
    resources = [aws_bedrockagent_knowledge_base.portfolio.arn]
  }

  statement {
    sid = "ConsumeIngestionQueue"
    actions = [
      "sqs:ChangeMessageVisibility",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage",
    ]
    resources = [aws_sqs_queue.rag_ingestion.arn]
  }

  statement {
    sid       = "WriteReindexLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.rag_reindex.arn}:*"]
  }
}

resource "aws_iam_role_policy" "rag_reindex" {
  name   = "${var.project_name}-rag-reindex"
  role   = aws_iam_role.rag_reindex.id
  policy = data.aws_iam_policy_document.rag_reindex.json
}

resource "aws_lambda_function" "rag_reindex" {
  function_name    = "${var.project_name}-rag-reindex"
  role             = aws_iam_role.rag_reindex.arn
  filename         = data.archive_file.rag_reindex.output_path
  source_code_hash = data.archive_file.rag_reindex.output_base64sha256
  runtime          = "python3.12"
  handler          = "rag_reindex.handler"
  architectures    = ["x86_64"]
  memory_size      = 128
  timeout          = 900

  environment {
    variables = {
      KNOWLEDGE_BASE_ID = aws_bedrockagent_knowledge_base.portfolio.id
      DATA_SOURCE_ID    = aws_bedrockagent_data_source.portfolio_documents.data_source_id
    }
  }

  depends_on = [aws_iam_role_policy.rag_reindex, aws_cloudwatch_log_group.rag_reindex]
}

resource "aws_lambda_event_source_mapping" "rag_ingestion" {
  event_source_arn                   = aws_sqs_queue.rag_ingestion.arn
  function_name                      = aws_lambda_function.rag_reindex.arn
  batch_size                         = 10
  maximum_batching_window_in_seconds = 60
  function_response_types            = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = 1
  }
}

resource "aws_iam_role_policy" "chatbot_retrieve_portfolio" {
  name = "${var.project_name}-retrieve-portfolio-documents"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["bedrock:Retrieve"]
      Resource = aws_bedrockagent_knowledge_base.portfolio.arn
    }]
  })
}
