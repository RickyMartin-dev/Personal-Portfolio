data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  state_bucket_name            = var.state_bucket_name != "" ? var.state_bucket_name : "${var.project_name}-tfstate-${data.aws_caller_identity.current.account_id}"
  oidc_provider_arn            = var.github_oidc_provider_arn != "" ? var.github_oidc_provider_arn : aws_iam_openid_connect_provider.github[0].arn
  state_key_prefix             = "personal-portfolio/chatbot/"
  repository_arn               = "arn:${data.aws_partition.current.partition}:ecr:${var.aws_region}:${data.aws_caller_identity.current.account_id}:repository/personal-portfolio-chatbot"
  lambda_arn                   = "arn:${data.aws_partition.current.partition}:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:personal-portfolio-chatbot"
  usage_table_arn              = "arn:${data.aws_partition.current.partition}:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/personal-portfolio-chatbot-monthly-usage"
  rate_limit_table_arn         = "arn:${data.aws_partition.current.partition}:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/personal-portfolio-chatbot-caller-rate-limit"
  lambda_role_arn              = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/personal-portfolio-chatbot-lambda"
  report_lambda_arn            = "arn:${data.aws_partition.current.partition}:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:personal-portfolio-chatbot-weekly-report"
  report_lambda_role           = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/personal-portfolio-chatbot-weekly-report"
  scheduler_role_arn           = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/personal-portfolio-chatbot-weekly-report-scheduler"
  report_topic_arn             = "arn:${data.aws_partition.current.partition}:sns:${var.aws_region}:${data.aws_caller_identity.current.account_id}:personal-portfolio-chatbot-weekly-report"
  report_subscription_arn      = "${local.report_topic_arn}:*"
  workload_boundary_arn        = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:policy/personal-portfolio-chatbot-workload-boundary"
  report_schedule_arn          = "arn:${data.aws_partition.current.partition}:scheduler:${var.aws_region}:${data.aws_caller_identity.current.account_id}:schedule/default/personal-portfolio-chatbot-weekly-report"
  rag_source_bucket_name       = "personal-portfolio-chatbot-rag-${data.aws_caller_identity.current.account_id}"
  rag_source_bucket_arn        = "arn:${data.aws_partition.current.partition}:s3:::${local.rag_source_bucket_name}"
  rag_vector_bucket_arn        = "arn:${data.aws_partition.current.partition}:s3vectors:${var.aws_region}:${data.aws_caller_identity.current.account_id}:bucket/personal-portfolio-chatbot-rag-vectors-${data.aws_caller_identity.current.account_id}"
  rag_vector_index_arn         = "${local.rag_vector_bucket_arn}/index/portfolio-documents"
  rag_knowledge_base_arn       = "arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:knowledge-base/*"
  rag_kb_role_arn              = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/personal-portfolio-chatbot-rag-knowledge-base"
  rag_reindex_role_arn         = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:role/personal-portfolio-chatbot-rag-reindex"
  rag_reindex_lambda_arn       = "arn:${data.aws_partition.current.partition}:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:function:personal-portfolio-chatbot-rag-reindex"
  rag_event_source_mapping_arn = "arn:${data.aws_partition.current.partition}:lambda:${var.aws_region}:${data.aws_caller_identity.current.account_id}:event-source-mapping:*"
  boundary_model_arns          = ["arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:inference-profile/us.amazon.nova-micro-v1:0", "arn:${data.aws_partition.current.partition}:bedrock:us-east-1::foundation-model/amazon.nova-micro-v1:0", "arn:${data.aws_partition.current.partition}:bedrock:us-east-2::foundation-model/amazon.nova-micro-v1:0", "arn:${data.aws_partition.current.partition}:bedrock:us-west-2::foundation-model/amazon.nova-micro-v1:0", "arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}::foundation-model/amazon.titan-embed-text-v2:0"]
  rag_queue_arn                = "arn:${data.aws_partition.current.partition}:sqs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:personal-portfolio-chatbot-rag-ingestion"
  log_group_arn                = "arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/personal-portfolio-chatbot*"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket        = local.state_bucket_name
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_budgets_budget" "monthly_account" {
  name         = "personal-portfolio-account-monthly-limit"
  budget_type  = "COST"
  time_unit    = "MONTHLY"
  limit_amount = "5"
  limit_unit   = "USD"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_notification_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_notification_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_notification_email]
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.github_oidc_provider_arn == "" ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "workload_permissions_boundary" {
  statement {
    sid       = "AllowPortfolioBedrockOperations"
    effect    = "Allow"
    actions   = ["bedrock:InvokeGuardrailChecks"]
    resources = ["*"]
  }

  statement {
    sid    = "InvokePortfolioModelsAndKnowledgeBase"
    effect = "Allow"
    actions = [
      "bedrock:GetIngestionJob",
      "bedrock:InvokeModel",
      "bedrock:Retrieve",
      "bedrock:StartIngestionJob",
    ]
    resources = concat(local.boundary_model_arns, [local.rag_knowledge_base_arn])
  }

  statement {
    sid       = "ReadAndWritePortfolioDocuments"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${local.rag_source_bucket_arn}/documents/*"]
  }

  statement {
    sid       = "ListPortfolioDocumentPrefix"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [local.rag_source_bucket_arn]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["documents/", "documents/*"]
    }
  }

  statement {
    sid    = "AccessPortfolioVectorIndex"
    effect = "Allow"
    actions = [
      "s3vectors:DeleteVectors",
      "s3vectors:GetIndex",
      "s3vectors:GetVectors",
      "s3vectors:PutVectors",
      "s3vectors:QueryVectors",
    ]
    resources = [local.rag_vector_index_arn]
  }

  statement {
    sid    = "AccessPortfolioOperationalResources"
    effect = "Allow"
    actions = [
      "dynamodb:UpdateItem",
      "lambda:InvokeFunction",
      "logs:CreateLogStream",
      "logs:FilterLogEvents",
      "logs:PutLogEvents",
      "sns:Publish",
      "sqs:ChangeMessageVisibility",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage",
    ]
    resources = [
      local.usage_table_arn,
      local.rate_limit_table_arn,
      local.report_lambda_arn,
      "${local.log_group_arn}:*",
      local.report_topic_arn,
      local.rag_queue_arn,
    ]
  }

  statement {
    sid       = "ReadPortfolioMetricsAndCostSummary"
    effect    = "Allow"
    actions   = ["ce:GetCostAndUsage", "cloudwatch:GetMetricData"]
    resources = ["*"]
  }

  statement {
    sid       = "DenyRuntimeRoleAdministration"
    effect    = "Deny"
    actions   = ["iam:*", "organizations:*", "account:*", "sts:AssumeRole", "sts:AssumeRoleWithWebIdentity", "sts:TagSession"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "workload_permissions_boundary" {
  name        = "personal-portfolio-chatbot-workload-boundary"
  description = "Maximum allowed permissions for portfolio application roles; blocks IAM and account privilege escalation."
  policy      = data.aws_iam_policy_document.workload_permissions_boundary.json
}

data "aws_iam_policy_document" "github_assume_role" {
  statement {
    sid     = "GitHubActionsFromDevelopOnly"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity", "sts:TagSession"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:environment:aws-production"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name                 = var.deploy_role_name
  assume_role_policy   = data.aws_iam_policy_document.github_assume_role.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "TerraformStateBucketList"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.terraform_state.arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${local.state_key_prefix}*"]
    }
  }

  statement {
    sid       = "TerraformStateObjectAccess"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.terraform_state.arn}/${local.state_key_prefix}*"]
  }

  statement {
    sid       = "EcrAuthentication"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "PublishChatbotContainer"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:CreateRepository",
      "ecr:DeleteLifecyclePolicy",
      "ecr:DeleteRepository",
      "ecr:DescribeImages",
      "ecr:DescribeRepositories",
      "ecr:GetRepositoryPolicy",
      "ecr:GetDownloadUrlForLayer",
      "ecr:GetLifecyclePolicy",
      "ecr:InitiateLayerUpload",
      "ecr:ListImages",
      "ecr:ListTagsForResource",
      "ecr:PutImage",
      "ecr:PutImageScanningConfiguration",
      "ecr:PutImageTagMutability",
      "ecr:PutLifecyclePolicy",
      "ecr:SetRepositoryPolicy",
      "ecr:UploadLayerPart",
      "ecr:TagResource",
      "ecr:UntagResource",
    ]
    resources = [local.repository_arn]
  }

  statement {
    sid    = "ManageChatbotLambda"
    effect = "Allow"
    actions = [
      "lambda:AddPermission",
      "lambda:CreateFunction",
      "lambda:DeleteFunction",
      "lambda:GetFunctionCodeSigningConfig",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:GetPolicy",
      "lambda:ListTags",
      "lambda:ListVersionsByFunction",
      "lambda:RemovePermission",
      "lambda:TagResource",
      "lambda:UntagResource",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
    ]
    resources = [local.lambda_arn]
  }

  statement {
    sid       = "ListLambdaFunctions"
    effect    = "Allow"
    actions   = ["lambda:ListFunctions"]
    resources = ["*"]
  }

  statement {
    sid    = "CreateAndUpdateBoundedWorkloadRoles"
    effect = "Allow"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRolePolicy",
      "iam:PutRolePermissionsBoundary",
      "iam:PutRolePolicy",
    ]
    resources = [local.lambda_role_arn, local.report_lambda_role, local.scheduler_role_arn, local.rag_kb_role_arn, local.rag_reindex_role_arn]

    condition {
      test     = "ArnEquals"
      variable = "iam:PermissionsBoundary"
      values   = [local.workload_boundary_arn]
    }
  }

  statement {
    sid       = "TagManagedWorkloadRoles"
    effect    = "Allow"
    actions   = ["iam:TagRole", "iam:UntagRole"]
    resources = [local.lambda_role_arn, local.report_lambda_role, local.scheduler_role_arn, local.rag_kb_role_arn, local.rag_reindex_role_arn]
  }

  statement {
    sid       = "ReadManagedWorkloadRoles"
    effect    = "Allow"
    actions   = ["iam:GetRole", "iam:GetRolePolicy", "iam:ListRolePolicies", "iam:ListAttachedRolePolicies"]
    resources = [local.lambda_role_arn, local.report_lambda_role, local.scheduler_role_arn, local.rag_kb_role_arn, local.rag_reindex_role_arn]
  }

  statement {
    sid       = "PassChatbotRoleToLambda"
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = [local.lambda_role_arn]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com"]
    }
  }

  statement {
    sid       = "PassReportRoleToLambda"
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = [local.report_lambda_role, local.rag_reindex_role_arn]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com"]
    }
  }

  statement {
    sid       = "PassSchedulerRoleToScheduler"
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = [local.scheduler_role_arn]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["scheduler.amazonaws.com"]
    }
  }

  statement {
    sid       = "PassKnowledgeBaseRoleToBedrock"
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = [local.rag_kb_role_arn]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["bedrock.amazonaws.com"]
    }
  }

  statement {
    sid       = "ReadRegionalApiGatewayMetadata"
    effect    = "Allow"
    actions   = ["apigateway:GET"]
    resources = ["arn:${data.aws_partition.current.partition}:apigateway:${var.aws_region}::/apis", "arn:${data.aws_partition.current.partition}:apigateway:${var.aws_region}::/apis/*"]
  }

  statement {
    sid       = "CreateTaggedPortfolioHttpApi"
    effect    = "Allow"
    actions   = ["apigateway:POST"]
    resources = ["arn:${data.aws_partition.current.partition}:apigateway:${var.aws_region}::/apis"]
    condition {
      test     = "StringEquals"
      variable = "aws:RequestTag/Project"
      values   = ["personal-portfolio-chatbot"]
    }
  }

  statement {
    sid       = "CreateTaggedStageOnPortfolioApi"
    effect    = "Allow"
    actions   = ["apigateway:POST"]
    resources = ["arn:${data.aws_partition.current.partition}:apigateway:${var.aws_region}::/apis/*/stages"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Project"
      values   = ["personal-portfolio-chatbot"]
    }
    condition {
      test     = "StringEquals"
      variable = "aws:RequestTag/Project"
      values   = ["personal-portfolio-chatbot"]
    }
  }

  statement {
    sid    = "ManageTaggedPortfolioHttpApi"
    effect = "Allow"
    actions = [
      "apigateway:DELETE",
      "apigateway:PATCH",
      "apigateway:POST",
      "apigateway:PUT",
    ]
    resources = ["arn:${data.aws_partition.current.partition}:apigateway:${var.aws_region}::/apis/*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Project"
      values   = ["personal-portfolio-chatbot"]
    }
  }


  statement {
    sid     = "TagChatbotHttpApiStages"
    effect  = "Allow"
    actions = ["apigateway:TagResource", "apigateway:UntagResource"]
    resources = [
      "arn:${data.aws_partition.current.partition}:apigateway:${var.aws_region}::/apis/*/stages",
      "arn:${data.aws_partition.current.partition}:apigateway:${var.aws_region}::/apis/*/stages/*",
    ]
  }

  statement {
    sid       = "ManageChatbotLogGroups"
    effect    = "Allow"
    actions   = ["logs:CreateLogGroup", "logs:DeleteLogGroup", "logs:DeleteRetentionPolicy", "logs:DescribeLogGroups", "logs:ListTagsForResource", "logs:PutRetentionPolicy", "logs:TagResource", "logs:UntagResource"]
    resources = [local.log_group_arn, "arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/apigateway/personal-portfolio-chatbot*"]
  }

  statement {
    sid       = "DescribeLogGroups"
    effect    = "Allow"
    actions   = ["logs:DescribeLogGroups"]
    resources = ["*"]
  }

  statement {
    sid    = "ManageWeeklyReportLambda"
    effect = "Allow"
    actions = [
      "lambda:CreateFunction",
      "lambda:DeleteFunction",
      "lambda:GetFunctionCodeSigningConfig",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:ListVersionsByFunction",
      "lambda:ListTags",
      "lambda:TagResource",
      "lambda:UntagResource",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
    ]
    resources = [local.report_lambda_arn]
  }

  statement {
    sid       = "ManageWeeklyReportLogs"
    effect    = "Allow"
    actions   = ["logs:CreateLogGroup", "logs:DeleteLogGroup", "logs:DeleteRetentionPolicy", "logs:DescribeLogGroups", "logs:ListTagsForResource", "logs:PutRetentionPolicy", "logs:TagResource", "logs:UntagResource"]
    resources = ["arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/personal-portfolio-chatbot-weekly-report*"]
  }

  statement {
    sid    = "ManageWeeklyReportTopic"
    effect = "Allow"
    actions = [
      "sns:CreateTopic",
      "sns:DeleteTopic",
      "sns:GetTopicAttributes",
      "sns:GetSubscriptionAttributes",
      "sns:ListSubscriptionsByTopic",
      "sns:ListTagsForResource",
      "sns:SetTopicAttributes",
      "sns:SetSubscriptionAttributes",
      "sns:Subscribe",
      "sns:TagResource",
      "sns:Unsubscribe",
      "sns:UntagResource",
    ]
    resources = [local.report_topic_arn, local.report_subscription_arn]
  }

  statement {
    sid    = "ManageWeeklyReportSchedule"
    effect = "Allow"
    actions = [
      "scheduler:CreateSchedule",
      "scheduler:DeleteSchedule",
      "scheduler:GetSchedule",
      "scheduler:ListTagsForResource",
      "scheduler:TagResource",
      "scheduler:UntagResource",
      "scheduler:UpdateSchedule",
    ]
    resources = [local.report_schedule_arn]
  }

  statement {
    sid    = "ManageRagSourceBucket"
    effect = "Allow"
    actions = [
      "s3:CreateBucket",
      "s3:DeleteBucket",
      "s3:GetAccelerateConfiguration",
      "s3:GetBucketAcl",
      "s3:GetBucketCORS",
      "s3:GetBucketLogging",
      "s3:GetBucketObjectLockConfiguration",
      "s3:GetBucketPolicy",
      "s3:GetBucketLocation",
      "s3:GetBucketNotification",
      "s3:GetBucketOwnershipControls",
      "s3:GetBucketPublicAccessBlock",
      "s3:GetBucketRequestPayment",
      "s3:GetEncryptionConfiguration",
      "s3:GetBucketTagging",
      "s3:GetBucketVersioning",
      "s3:GetBucketWebsite",
      "s3:GetLifecycleConfiguration",
      "s3:GetReplicationConfiguration",
      "s3:ListBucket",
      "s3:PutBucketNotification",
      "s3:PutBucketOwnershipControls",
      "s3:PutBucketPublicAccessBlock",
      "s3:PutEncryptionConfiguration",
      "s3:PutBucketTagging",
      "s3:PutLifecycleConfiguration",
    ]
    resources = [local.rag_source_bucket_arn]
  }

  statement {
    sid    = "ManageRagQueues"
    effect = "Allow"
    actions = [
      "sqs:CreateQueue",
      "sqs:DeleteQueue",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
      "sqs:ListQueueTags",
      "sqs:SetQueueAttributes",
      "sqs:TagQueue",
      "sqs:UntagQueue",
    ]
    resources = [local.rag_queue_arn, "${local.rag_queue_arn}-dlq"]
  }

  statement {
    sid    = "ManageRagReindexLambda"
    effect = "Allow"
    actions = [
      "lambda:CreateFunction",
      "lambda:DeleteFunction",
      "lambda:GetFunctionCodeSigningConfig",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:ListVersionsByFunction",
      "lambda:ListTags",
      "lambda:TagResource",
      "lambda:UntagResource",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
    ]
    resources = [local.rag_reindex_lambda_arn]
  }

  statement {
    sid    = "ManageRagEventSourceMapping"
    effect = "Allow"
    actions = [
      "lambda:CreateEventSourceMapping",
      "lambda:DeleteEventSourceMapping",
      "lambda:GetEventSourceMapping",
      "lambda:ListTags",
      "lambda:TagResource",
      "lambda:UntagResource",
      "lambda:UpdateEventSourceMapping",
    ]
    resources = [local.rag_event_source_mapping_arn]
    condition {
      test     = "ArnEquals"
      variable = "lambda:FunctionArn"
      values   = [local.rag_reindex_lambda_arn]
    }
  }

  statement {
    sid    = "ManageRagLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:DeleteLogGroup",
      "logs:DeleteRetentionPolicy",
      "logs:DescribeLogGroups",
      "logs:ListTagsForResource",
      "logs:PutRetentionPolicy",
      "logs:TagResource",
      "logs:UntagResource",
    ]
    resources = ["arn:${data.aws_partition.current.partition}:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/personal-portfolio-chatbot-rag-reindex*"]
  }

  statement {
    sid       = "CreatePortfolioKnowledgeBase"
    effect    = "Allow"
    actions   = ["bedrock:CreateKnowledgeBase"]
    resources = ["*"]
  }

  statement {
    sid    = "ManagePortfolioKnowledgeBase"
    effect = "Allow"
    actions = [
      "bedrock:CreateDataSource",
      "bedrock:DeleteDataSource",
      "bedrock:DeleteKnowledgeBase",
      "bedrock:GetDataSource",
      "bedrock:GetKnowledgeBase",
      "bedrock:ListTagsForResource",
      "bedrock:ListDataSources",
      "bedrock:ListIngestionJobs",
      "bedrock:ListKnowledgeBases",
      "bedrock:StartIngestionJob",
      "bedrock:StopIngestionJob",
      "bedrock:TagResource",
      "bedrock:UntagResource",
      "bedrock:UpdateDataSource",
      "bedrock:UpdateKnowledgeBase",
    ]
    resources = [local.rag_knowledge_base_arn]
  }

  statement {
    sid    = "ManagePortfolioVectorStore"
    effect = "Allow"
    actions = [
      "s3vectors:CreateVectorBucket",
      "s3vectors:DeleteVectorBucket",
      "s3vectors:GetVectorBucket",
      "s3vectors:CreateIndex",
      "s3vectors:DeleteIndex",
      "s3vectors:GetIndex",
      "s3vectors:ListIndexes",
      "s3vectors:ListTagsForResource",
      "s3vectors:TagResource",
      "s3vectors:UntagResource",
      "s3vectors:UpdateIndexMode",
    ]
    resources = [local.rag_vector_bucket_arn, local.rag_vector_index_arn]
  }

  statement {
    sid       = "ListPortfolioVectorBuckets"
    effect    = "Allow"
    actions   = ["s3vectors:ListVectorBuckets"]
    resources = ["*"]
  }

  statement {
    sid    = "ManageMonthlyUsageTable"
    effect = "Allow"
    actions = [
      "dynamodb:CreateTable",
      "dynamodb:DeleteTable",
      "dynamodb:DescribeContinuousBackups",
      "dynamodb:DescribeTable",
      "dynamodb:DescribeTimeToLive",
      "dynamodb:ListTagsOfResource",
      "dynamodb:TagResource",
      "dynamodb:UntagResource",
      "dynamodb:UpdateTable",
    ]
    resources = [local.usage_table_arn, local.rate_limit_table_arn]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "${var.project_name}-github-deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}
