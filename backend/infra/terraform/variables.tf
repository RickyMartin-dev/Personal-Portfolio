variable "aws_region" {
  description = "AWS region for the API, Lambda, and source Bedrock endpoint."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Stable prefix for chatbot resource names."
  type        = string
  default     = "personal-portfolio-chatbot"
}

variable "bedrock_model_id" {
  description = "Bedrock model or inference profile ID used identically in local and deployed settings."
  type        = string
  default     = "us.anthropic.claude-haiku-5-5"
}

variable "model_destination_regions" {
  description = "Regions backing the default US Bedrock inference profile. Include the selected source region if you change aws_region."
  type        = list(string)
  default     = ["us-east-1", "us-east-2", "us-west-2"]
}

variable "allowed_origins" {
  description = "Browser origins allowed to call the public HTTP API. CORS is not API authentication."
  type        = list(string)
  default = [
    "https://rickymartin-dev.github.io",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
  ]
}

variable "max_output_tokens" {
  description = "Hard output token ceiling passed to Bedrock."
  type        = number
  default     = 300

  validation {
    condition     = var.max_output_tokens >= 1 && var.max_output_tokens <= 300
    error_message = "max_output_tokens must be between 1 and 300."
  }
}

variable "guardrail_block_threshold" {
  description = "Block when a Bedrock content or prompt-attack severity score meets this threshold."
  type        = number
  default     = 0.5

  validation {
    condition     = var.guardrail_block_threshold >= 0 && var.guardrail_block_threshold <= 1
    error_message = "guardrail_block_threshold must be between 0 and 1."
  }
}

variable "api_throttle_rate" {
  description = "Best-effort aggregate API Gateway requests per second."
  type        = number
  default     = 0.25

  validation {
    condition     = var.api_throttle_rate > 0
    error_message = "api_throttle_rate must be greater than 0."
  }
}

variable "api_throttle_burst" {
  description = "Best-effort API Gateway request burst limit."
  type        = number
  default     = 1

  validation {
    condition     = var.api_throttle_burst >= 1
    error_message = "api_throttle_burst must be at least 1."
  }
}

variable "lambda_memory_size" {
  description = "Lambda memory in MB."
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds; the HTTP API integration has a 30-second ceiling."
  type        = number
  default     = 28

  validation {
    condition     = var.lambda_timeout >= 1 && var.lambda_timeout <= 28
    error_message = "lambda_timeout must be between 1 and 28 seconds."
  }
}

variable "lambda_reserved_concurrency" {
  description = "Maximum concurrent Lambda requests to limit accidental model spend."
  type        = number
  default     = 1
}

variable "image_tag" {
  description = "Immutable Git commit tag already present in ECR before a full Terraform apply."
  type        = string
  default     = "bootstrap"

  validation {
    condition     = can(regex("^[A-Za-z0-9_./-]{1,128}$", var.image_tag))
    error_message = "image_tag may contain only letters, numbers, underscore, period, slash, and hyphen."
  }
}

variable "log_retention_days" {
  description = "CloudWatch application and API access log retention."
  type        = number
  default     = 14
}

variable "monthly_chat_limit" {
  description = "Hard aggregate cap on valid chat requests per UTC calendar month."
  type        = number
  default     = 1000

  validation {
    condition     = var.monthly_chat_limit >= 1 && floor(var.monthly_chat_limit) == var.monthly_chat_limit
    error_message = "monthly_chat_limit must be a positive integer."
  }
}
