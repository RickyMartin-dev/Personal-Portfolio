output "ecr_repository_url" {
  description = "ECR repository URL; push a tagged image here before a full first apply."
  value       = aws_ecr_repository.chatbot.repository_url
}

output "api_endpoint" {
  description = "Exact public POST URL for chatbot requests."
  value       = "${aws_apigatewayv2_api.chatbot.api_endpoint}/chat"
}

output "api_base_url" {
  description = "HTTP API base URL; GET /health is available here."
  value       = aws_apigatewayv2_api.chatbot.api_endpoint
}

output "lambda_function_name" {
  description = "Managed Lambda function name."
  value       = aws_lambda_function.chatbot.function_name
}

output "lambda_log_group_name" {
  description = "CloudWatch application log group with bounded retention."
  value       = aws_cloudwatch_log_group.lambda.name
}

output "monthly_usage_table_name" {
  description = "Aggregate monthly request counter; contains no prompts or visitor data."
  value       = aws_dynamodb_table.monthly_usage.name
}

output "rag_documents_bucket_name" {
  description = "Private S3 bucket for approved portfolio documents; upload only to the documents/ prefix."
  value       = aws_s3_bucket.rag_documents.bucket
}

output "rag_documents_s3_uri" {
  description = "Owner upload location monitored for create, replace, and delete events."
  value       = "s3://${aws_s3_bucket.rag_documents.bucket}/documents/"
}

output "rag_knowledge_base_id" {
  description = "Amazon Bedrock Knowledge Base queried by the chatbot's document search tool."
  value       = aws_bedrockagent_knowledge_base.portfolio.id
}

output "rag_vector_index_arn" {
  description = "Low-cost S3 Vectors index storing Bedrock document embeddings."
  value       = aws_s3vectors_index.portfolio.index_arn
}
