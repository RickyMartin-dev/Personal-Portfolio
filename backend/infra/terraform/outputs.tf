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

output "api_access_log_group_name" {
  description = "CloudWatch HTTP API access log group; request/response bodies are not recorded."
  value       = aws_cloudwatch_log_group.api.name
}
