"""Regression checks for the develop-only, gated production deployment."""

from __future__ import annotations

import os
import subprocess
from fnmatch import fnmatchcase
from pathlib import Path

import hcl2
import pytest
import yaml


DEPLOY_WORKFLOW_PATH = (
    Path(__file__).resolve().parents[2] / ".github" / "workflows" / "deploy.yml"
)
DEPLOY_WORKFLOW = DEPLOY_WORKFLOW_PATH.read_text(encoding="utf-8")
BOOTSTRAP_TERRAFORM_PATH = (
    Path(__file__).resolve().parents[1] / "infra" / "bootstrap" / "main.tf"
)
IMAGE_STEP_NAME = "Build and publish the immutable Lambda image"
IMAGE_TAG = "0123456789abcdef0123456789abcdef01234567"
ECR_URL = "123456789012.dkr.ecr.us-east-1.amazonaws.com/portfolio-chatbot"
DOCKER_MANIFEST = "application/vnd.docker.distribution.manifest.v2+json"
STUB_COMMAND = """#!/usr/bin/env bash
printf '%s %s\\n' "$(basename "$0")" "$*" >> "$STUB_CALL_LOG"
case "$(basename "$0") $*" in
  "terraform "*"output -raw ecr_repository_url") printf '%s' "$STUB_ECR_URL" ;;
  "aws ecr get-login-password"*) printf 'stub-password' ;;
  "aws ecr list-images"*) printf '%s\\n' "$STUB_PUBLISHED_TAG" ;;
  "aws ecr batch-get-image"*) printf '%s\\n' "$STUB_MEDIA_TYPE" ;;
  "docker login"*) cat > /dev/null ;;
esac
"""


def run_image_step(
    tmp_path: Path, published_tag: str, media_type: str = DOCKER_MANIFEST
) -> tuple[subprocess.CompletedProcess[str], list[str]]:
    workflow = yaml.safe_load(DEPLOY_WORKFLOW)
    script = next(
        step["run"]
        for step in workflow["jobs"]["deploy-backend"]["steps"]
        if step.get("name") == IMAGE_STEP_NAME
    )
    stubs = tmp_path / "bin"
    stubs.mkdir()
    for command in ("aws", "docker", "terraform"):
        stub = stubs / command
        stub.write_text(STUB_COMMAND, encoding="utf-8")
        stub.chmod(0o755)
    call_log = tmp_path / "calls.log"
    call_log.touch()
    environment = {
        "PATH": f"{stubs}{os.pathsep}{os.environ['PATH']}",
        "AWS_REGION": "us-east-1",
        "IMAGE_TAG": IMAGE_TAG,
        "STUB_CALL_LOG": str(call_log),
        "STUB_ECR_URL": ECR_URL,
        "STUB_PUBLISHED_TAG": published_tag,
        "STUB_MEDIA_TYPE": media_type,
    }
    result = subprocess.run(
        ["bash", "--noprofile", "--norc", "-eo", "pipefail", "-c", script],
        cwd=tmp_path,
        env=environment,
        text=True,
        capture_output=True,
        check=False,
    )
    return result, call_log.read_text(encoding="utf-8").splitlines()


def deploy_role_statements_granting(action: str) -> list[dict]:
    with BOOTSTRAP_TERRAFORM_PATH.open(encoding="utf-8") as terraform:
        root = hcl2.load(terraform)
    documents = {
        name.strip('"'): body
        for block in root["data"]
        for kind, named in block.items()
        if kind.strip('"') == "aws_iam_policy_document"
        for name, body in named.items()
    }
    return [
        statement
        for statement in documents["github_deploy"]["statement"]
        if statement["effect"].strip('"') == "Allow"
        and any(
            fnmatchcase(action, pattern.strip('"'))
            for pattern in statement["actions"]
        )
    ]


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


def test_deployment_retry_reuses_the_published_immutable_image(tmp_path: Path) -> None:
    result, calls = run_image_step(tmp_path, published_tag=IMAGE_TAG)

    assert result.returncode == 0, result.stderr
    assert not [call for call in calls if call.startswith("docker buildx")]
    assert any(
        call.startswith("aws ecr batch-get-image")
        and f"imageTag={IMAGE_TAG}" in call
        for call in calls
    )


def test_deployment_builds_and_pushes_when_the_image_tag_is_unpublished(
    tmp_path: Path,
) -> None:
    result, calls = run_image_step(tmp_path, published_tag="None")

    builds = [call for call in calls if call.startswith("docker buildx build")]
    assert result.returncode == 0, result.stderr
    assert len(builds) == 1
    assert f"--tag {ECR_URL}:{IMAGE_TAG}" in builds[0]
    assert "--push" in builds[0]
    assert calls.index(builds[0]) < next(
        index
        for index, call in enumerate(calls)
        if call.startswith("aws ecr batch-get-image")
    )


def test_deployment_rejects_a_reused_image_with_an_unsupported_manifest(
    tmp_path: Path,
) -> None:
    result, calls = run_image_step(
        tmp_path,
        published_tag=IMAGE_TAG,
        media_type="application/vnd.oci.image.index.v1+json",
    )

    assert result.returncode == 1
    assert "::error::" in result.stdout
    assert not [call for call in calls if call.startswith("docker buildx")]


@pytest.mark.parametrize(
    ("action", "resources"),
    [
        ("s3:GetAccelerateConfiguration", {"${local.rag_source_bucket_arn}"}),
        ("s3:GetBucketAcl", {"${local.rag_source_bucket_arn}"}),
        ("s3:GetBucketCORS", {"${local.rag_source_bucket_arn}"}),
        ("s3:GetBucketLogging", {"${local.rag_source_bucket_arn}"}),
        (
            "s3:GetBucketObjectLockConfiguration",
            {"${local.rag_source_bucket_arn}"},
        ),
        ("s3:GetBucketPolicy", {"${local.rag_source_bucket_arn}"}),
        (
            "s3:GetBucketRequestPayment",
            {"${local.rag_source_bucket_arn}"},
        ),
        (
            "s3:GetEncryptionConfiguration",
            {"${local.rag_source_bucket_arn}"},
        ),
        ("s3:GetBucketTagging", {"${local.rag_source_bucket_arn}"}),
        ("s3:GetBucketVersioning", {"${local.rag_source_bucket_arn}"}),
        ("s3:GetBucketWebsite", {"${local.rag_source_bucket_arn}"}),
        (
            "s3:GetReplicationConfiguration",
            {"${local.rag_source_bucket_arn}"},
        ),
        ("s3:PutBucketTagging", {"${local.rag_source_bucket_arn}"}),
        (
            "sns:ListTagsForResource",
            {"${local.report_topic_arn}", "${local.report_subscription_arn}"},
        ),
        (
            "s3:PutEncryptionConfiguration",
            {"${local.rag_source_bucket_arn}"},
        ),
    ],
)
def test_deploy_role_resource_permissions_are_limited_to_managed_resources(
    action: str, resources: set[str]
) -> None:
    statements = deploy_role_statements_granting(action)

    assert statements
    for statement in statements:
        assert set(statement["resources"]) == resources


def test_deploy_role_uses_valid_s3_encryption_actions() -> None:
    assert not deploy_role_statements_granting("s3:GetBucketServerSideEncryption")
    assert not deploy_role_statements_granting("s3:PutBucketServerSideEncryption")


def test_lambda_version_reads_are_scoped_to_managed_functions() -> None:
    statements = deploy_role_statements_granting("lambda:ListVersionsByFunction")

    assert statements
    resources = {
        resource
        for statement in statements
        for resource in statement["resources"]
    }
    assert resources == {
        "${local.lambda_arn}",
        "${local.report_lambda_arn}",
        "${local.rag_reindex_lambda_arn}",
    }
    assert all(len(statement["resources"]) == 1 for statement in statements)
