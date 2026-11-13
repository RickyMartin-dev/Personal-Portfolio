# One-time Terraform bootstrap

This root creates a $5 monthly account-wide AWS budget with alerts at 80%/100% actual and 100% forecast spend, the private versioned Terraform state bucket, and a GitHub Actions OIDC role restricted to `RickyMartin-dev/Personal-Portfolio` on `develop`. The bootstrap uses local Terraform state; the state file is ignored by Git and must stay on the trusted setup machine.

## First run

Use a local AWS CLI profile with permission to create the bucket, IAM OIDC provider (if needed), deploy role, and role policy. No static AWS access keys are stored in GitHub.

```bash
cd backend/infra/bootstrap
AWS_PROFILE=your-profile terraform init
AWS_PROFILE=your-profile terraform plan -var='budget_notification_email=owner@example.com'
AWS_PROFILE=your-profile terraform apply -var='budget_notification_email=owner@example.com'
```

If the account already has `https://token.actions.githubusercontent.com` registered as an IAM OIDC provider, pass its ARN so Terraform reuses it instead of attempting to create a duplicate:

```bash
AWS_PROFILE=your-profile terraform apply \
  -var='github_oidc_provider_arn=arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com'
```

Copy the `deploy_role_arn` output into the GitHub repository variable `AWS_ROLE_ARN`. Copy `tf_state_bucket` into the repository variable `TF_STATE_BUCKET`. These are identifiers, not credentials. Keep `develop` as the trust-policy branch.

The S3 bucket has public access blocked, SSE-S3 encryption, versioning, and a 90-day lifecycle for old state versions. It uses Terraform's S3 native lock file; there is no Terraform lock table. The budget notification is an alert, not a hard spend cutoff. The chatbot has a separate 1,000-request UTC-month hard cap.

## App root remote state

Initialize `infra/terraform` using the bucket output from bootstrap:

```bash
cd ../terraform
terraform init \
  -backend-config="bucket=$(terraform -chdir=../bootstrap output -raw tf_state_bucket)" \
  -backend-config="region=us-east-1" \
  -backend-config="encrypt=true" \
  -backend-config="use_lockfile=true"
```

The GitHub workflow passes the same backend settings from `TF_STATE_BUCKET` and `AWS_REGION` on every run. Do not upload or commit either root's local state, `.terraform/`, or variable files. Add no AWS access keys to GitHub; the deploy job assumes the OIDC role for the exact `develop` branch.
