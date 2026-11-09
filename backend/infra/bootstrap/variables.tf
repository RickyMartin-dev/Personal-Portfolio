variable "aws_region" {
  description = "Region for the Terraform state bucket and application resources."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short project label used in resource names and tags."
  type        = string
  default     = "personal-portfolio"
}

variable "state_bucket_name" {
  description = "Optional globally unique state bucket name. Defaults to a name suffixed with the AWS account ID."
  type        = string
  default     = ""
}

variable "github_repository" {
  description = "GitHub owner/repository allowed to assume the deploy role."
  type        = string
  default     = "RickyMartin-dev/Personal-Portfolio"
}

variable "deploy_branch" {
  description = "Only this GitHub branch can assume the deploy role."
  type        = string
  default     = "develop"
}

variable "github_oidc_provider_arn" {
  description = "Set this when the account already has the GitHub OIDC provider; leave empty to create it."
  type        = string
  default     = ""
}

variable "deploy_role_name" {
  description = "IAM role assumed by the GitHub Actions workflow on the deploy branch."
  type        = string
  default     = "personal-portfolio-github-deploy"
}
