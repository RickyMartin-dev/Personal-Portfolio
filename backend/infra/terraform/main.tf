data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

locals {
  model_name            = trimprefix(var.bedrock_model_id, "us.")
  inference_profile_arn = "arn:${data.aws_partition.current.partition}:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.bedrock_model_id}"
  foundation_model_arns = [for region in distinct(concat(var.model_destination_regions, [var.aws_region])) : "arn:${data.aws_partition.current.partition}:bedrock:${region}::foundation-model/${local.model_name}"]
  lambda_role_name      = "${var.project_name}-lambda"
  workload_boundary_arn = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:policy/${var.project_name}-workload-boundary"
  usage_table_name      = "${var.project_name}-monthly-usage"
  rate_limit_table_name = "${var.project_name}-caller-rate-limit"
  lambda_log_group_name = "/aws/lambda/${var.project_name}"
  image_uri             = "${aws_ecr_repository.chatbot.repository_url}:${var.image_tag}"
  allowed_origin_string = join(",", var.allowed_origins)
}

resource "aws_ecr_repository" "chatbot" {
  name                 = var.project_name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "chatbot" {
  repository = aws_ecr_repository.chatbot.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only the newest tagged deploy image"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*"]
          countType      = "imageCountMoreThan"
          countNumber    = 1
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after one day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1
        }
        action = { type = "expire" }
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = local.lambda_log_group_name
  retention_in_days = var.log_retention_days
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name                 = local.lambda_role_name
  assume_role_policy   = data.aws_iam_policy_document.lambda_assume_role.json
  permissions_boundary = local.workload_boundary_arn
}

data "aws_iam_policy_document" "lambda_permissions" {
  statement {
    sid       = "InvokeDefaultUsBedrockProfile"
    effect    = "Allow"
    actions   = ["bedrock:InvokeModel"]
    resources = [local.inference_profile_arn]
  }

  statement {
    sid       = "InvokeFoundationModelsThroughProfile"
    effect    = "Allow"
    actions   = ["bedrock:InvokeModel"]
    resources = local.foundation_model_arns

    condition {
      test     = "StringEquals"
      variable = "bedrock:InferenceProfileArn"
      values   = [local.inference_profile_arn]
    }
  }

  statement {
    sid       = "EvaluateInlineSafetyChecks"
    effect    = "Allow"
    actions   = ["bedrock:InvokeGuardrailChecks"]
    resources = ["*"]
  }

  statement {
    sid    = "WriteLambdaLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }

  statement {
    sid       = "ReserveMonthlyChatUsage"
    effect    = "Allow"
    actions   = ["dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.monthly_usage.arn, aws_dynamodb_table.caller_rate_limit.arn]
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "${var.project_name}-runtime"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_permissions.json
}

resource "aws_dynamodb_table" "monthly_usage" {
  name                        = local.usage_table_name
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "month"
  deletion_protection_enabled = true

  attribute {
    name = "month"
    type = "S"
  }
}

resource "aws_dynamodb_table" "caller_rate_limit" {
  name                        = local.rate_limit_table_name
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "callerWindow"
  deletion_protection_enabled = true

  attribute {
    name = "callerWindow"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}

resource "aws_lambda_function" "chatbot" {
  function_name = var.project_name
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = local.image_uri
  architectures = ["x86_64"]
  memory_size   = var.lambda_memory_size
  timeout       = var.lambda_timeout

  environment {
    variables = {
      BEDROCK_REGION             = var.aws_region
      BEDROCK_MODEL_ID           = var.bedrock_model_id
      BEDROCK_KNOWLEDGE_BASE_ID  = aws_bedrockagent_knowledge_base.portfolio.id
      MAX_OUTPUT_TOKENS          = tostring(var.max_output_tokens)
      GUARDRAIL_BLOCK_THRESHOLD  = tostring(var.guardrail_block_threshold)
      ALLOWED_ORIGINS            = local.allowed_origin_string
      MONTHLY_CHAT_LIMIT         = tostring(var.monthly_chat_limit)
      USAGE_TABLE_NAME           = aws_dynamodb_table.monthly_usage.name
      USAGE_BUDGET_REQUIRED      = "true"
      CHAT_RATE_LIMIT            = tostring(var.chat_rate_limit)
      CHAT_RATE_WINDOW_SECONDS   = "60"
      CHAT_RATE_LIMIT_TABLE_NAME = aws_dynamodb_table.caller_rate_limit.name
      CHAT_RATE_LIMIT_REQUIRED   = "true"
    }
  }

  depends_on = [
    aws_iam_role_policy.lambda,
    aws_cloudwatch_log_group.lambda,
  ]
}

resource "aws_apigatewayv2_api" "chatbot" {
  name          = var.project_name
  protocol_type = "HTTP"
  tags = {
    Project = var.project_name
  }

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "POST"]
    allow_headers = ["content-type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "chatbot" {
  api_id                 = aws_apigatewayv2_api.chatbot.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.chatbot.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = 28000
}

resource "aws_apigatewayv2_route" "chat" {
  api_id    = aws_apigatewayv2_api.chatbot.id
  route_key = "POST /chat"
  target    = "integrations/${aws_apigatewayv2_integration.chatbot.id}"
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.chatbot.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.chatbot.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.chatbot.id
  name        = "$default"
  auto_deploy = true
  tags = {
    Project = var.project_name
  }

  default_route_settings {
    throttling_rate_limit  = var.api_throttle_rate
    throttling_burst_limit = var.api_throttle_burst
  }

  depends_on = [
    aws_apigatewayv2_route.chat,
    aws_apigatewayv2_route.health,
  ]
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowHttpApiInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chatbot.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chatbot.execution_arn}/*/*"
}

data "archive_file" "weekly_report" {
  type        = "zip"
  source_file = "${path.module}/../../src/weekly_report.py"
  output_path = "${path.module}/.terraform/weekly-report.zip"
}

resource "aws_sns_topic" "weekly_report" {
  name = "${var.project_name}-weekly-report"
}

resource "aws_sns_topic_subscription" "weekly_report_email" {
  topic_arn = aws_sns_topic.weekly_report.arn
  protocol  = "email"
  endpoint  = var.weekly_report_email
}

data "aws_iam_policy_document" "weekly_report_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "weekly_report" {
  name                 = "${var.project_name}-weekly-report"
  assume_role_policy   = data.aws_iam_policy_document.weekly_report_assume_role.json
  permissions_boundary = local.workload_boundary_arn
}

data "aws_iam_policy_document" "weekly_report" {
  statement {
    sid       = "ReadSanitizedChatMetrics"
    actions   = ["logs:FilterLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }

  statement {
    sid       = "ReadAccountCostSummary"
    actions   = ["ce:GetCostAndUsage"]
    resources = ["*"]
  }

  statement {
    sid       = "EmailWeeklySnapshot"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.weekly_report.arn]
  }

  statement {
    sid       = "WriteReportLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.weekly_report.arn}:*"]
  }
}

resource "aws_iam_role_policy" "weekly_report" {
  name   = "${var.project_name}-weekly-report"
  role   = aws_iam_role.weekly_report.id
  policy = data.aws_iam_policy_document.weekly_report.json
}

resource "aws_cloudwatch_log_group" "weekly_report" {
  name              = "/aws/lambda/${var.project_name}-weekly-report"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "weekly_report" {
  function_name    = "${var.project_name}-weekly-report"
  role             = aws_iam_role.weekly_report.arn
  filename         = data.archive_file.weekly_report.output_path
  source_code_hash = data.archive_file.weekly_report.output_base64sha256
  runtime          = "python3.12"
  handler          = "weekly_report.handler"
  architectures    = ["x86_64"]
  memory_size      = 128
  timeout          = 60

  environment {
    variables = {
      CHATBOT_LOG_GROUP = aws_cloudwatch_log_group.lambda.name
      REPORT_TOPIC_ARN  = aws_sns_topic.weekly_report.arn
    }
  }

  depends_on = [aws_iam_role_policy.weekly_report, aws_cloudwatch_log_group.weekly_report]
}

data "aws_iam_policy_document" "weekly_report_scheduler_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "weekly_report_scheduler" {
  name                 = "${var.project_name}-weekly-report-scheduler"
  assume_role_policy   = data.aws_iam_policy_document.weekly_report_scheduler_assume_role.json
  permissions_boundary = local.workload_boundary_arn
}

data "aws_iam_policy_document" "weekly_report_scheduler" {
  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_function.weekly_report.arn]
  }
}

resource "aws_iam_role_policy" "weekly_report_scheduler" {
  name   = "${var.project_name}-weekly-report-invoke"
  role   = aws_iam_role.weekly_report_scheduler.id
  policy = data.aws_iam_policy_document.weekly_report_scheduler.json
}

resource "aws_scheduler_schedule" "weekly_report" {
  name                         = "${var.project_name}-weekly-report"
  schedule_expression          = "cron(0 8 ? * MON *)"
  schedule_expression_timezone = "America/New_York"
  state                        = "ENABLED"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.weekly_report.arn
    role_arn = aws_iam_role.weekly_report_scheduler.arn

    retry_policy {
      maximum_event_age_in_seconds = 3600
      maximum_retry_attempts       = 2
    }
  }

  depends_on = [aws_iam_role_policy.weekly_report_scheduler]
}
