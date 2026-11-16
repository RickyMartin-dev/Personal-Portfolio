"""Regression checks for the develop-only, gated production deployment."""

from pathlib import Path


DEPLOY_WORKFLOW = (
    Path(__file__).resolve().parents[2] / ".github" / "workflows" / "deploy.yml"
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

