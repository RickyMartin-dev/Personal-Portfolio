"""Regression checks for the develop-only, gated production deployment."""

from pathlib import Path


DEPLOY_WORKFLOW = (
    Path(__file__).resolve().parents[2] / ".github" / "workflows" / "deploy.yml"
).read_text(encoding="utf-8")
BOOTSTRAP_TERRAFORM = (
    Path(__file__).resolve().parents[1] / "infra" / "bootstrap" / "main.tf"
).read_text(encoding="utf-8")


def test_production_deployment_only_runs_from_develop_after_verification() -> None:
    assert "on:\n  push:\n    branches: [develop]" in DEPLOY_WORKFLOW
    assert "deploy-backend:\n    needs: verify-and-build" in DEPLOY_WORKFLOW
    assert "publish-site:\n    needs: [verify-and-build, deploy-backend]" in DEPLOY_WORKFLOW


def test_deployment_checks_required_email_and_aws_bootstrap_before_oidc() -> None:
    secret_check = DEPLOY_WORKFLOW.index('echo "::error::Set the WEEKLY_REPORT_EMAIL')
    oidc_credentials = DEPLOY_WORKFLOW.index(
        "aws-actions/configure-aws-credentials@"
    )

    assert 'if [[ -z "$AWS_ROLE_ARN" || -z "$TF_STATE_BUCKET" ]]' in DEPLOY_WORKFLOW
    assert secret_check < oidc_credentials
    assert "id-token: write" in DEPLOY_WORKFLOW


def test_deployment_checks_the_api_health_route_before_publishing_pages() -> None:
    health_check = DEPLOY_WORKFLOW.index("curl --fail --silent --show-error")
    publish_site = DEPLOY_WORKFLOW.index("publish-site:")

    assert health_check < publish_site


def test_deployment_reuses_existing_immutable_image_on_retries() -> None:
    image_step = DEPLOY_WORKFLOW.split(
        "      - name: Build and publish the immutable Lambda image", maxsplit=1
    )[1].split("      - name: Apply chatbot infrastructure", maxsplit=1)[0]

    assert "aws ecr list-images" in image_step
    assert 'if [[ "$existing_tag" == "$IMAGE_TAG" ]]' in image_step
    assert "Reusing the immutable image already published" in image_step
    assert '"$ecr_url:$IMAGE_TAG"' in image_step
    assert 'aws ecr batch-get-image' in image_step


def test_deploy_role_can_read_tags_for_only_the_managed_rag_and_report_resources() -> None:
    report_start = BOOTSTRAP_TERRAFORM.index(
        'sid    = "ManageWeeklyReportTopic"'
    )
    report_end = BOOTSTRAP_TERRAFORM.index(
        "resources = [local.report_topic_arn, local.report_subscription_arn]",
        report_start,
    )
    rag_start = BOOTSTRAP_TERRAFORM.index('sid    = "ManageRagSourceBucket"')
    rag_end = BOOTSTRAP_TERRAFORM.index(
        "resources = [local.rag_source_bucket_arn]", rag_start
    )

    assert '"sns:ListTagsForResource"' in BOOTSTRAP_TERRAFORM[report_start:report_end]
    assert '"s3:GetBucketTagging"' in BOOTSTRAP_TERRAFORM[rag_start:rag_end]

