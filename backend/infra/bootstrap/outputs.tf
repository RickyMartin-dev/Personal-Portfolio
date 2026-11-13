output "tf_state_bucket" {
  description = "S3 bucket for the app Terraform root's remote state."
  value       = aws_s3_bucket.terraform_state.bucket
}

output "tf_state_key" {
  description = "S3 state object key for the chatbot infrastructure."
  value       = "personal-portfolio/chatbot/terraform.tfstate"
}

output "github_oidc_provider_arn" {
  description = "GitHub Actions OIDC provider ARN to use if the app account needs to reference an existing provider."
  value       = local.oidc_provider_arn
}

output "deploy_role_arn" {
  description = "Role ARN to configure as the GitHub Actions AWS_ROLE_ARN repository variable."
  value       = aws_iam_role.github_deploy.arn
}

output "aws_account_id" {
  description = "AWS account ID used to construct the state bucket name."
  value       = data.aws_caller_identity.current.account_id
}

output "monthly_budget_name" {
  description = "Account-wide AWS cost budget with 80%, 100%, and forecast alerts."
  value       = aws_budgets_budget.monthly_account.name
}
