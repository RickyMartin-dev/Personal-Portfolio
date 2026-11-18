"""Regression checks for the develop-only, gated production deployment."""

from __future__ import annotations

import os
import subprocess
from fnmatch import fnmatchcase
from pathlib import Path
from urllib.parse import urlsplit

import hcl2
import pytest
import yaml


DEPLOY_WORKFLOW_PATH = (
    Path(__file__).resolve().parents[2] / ".github" / "workflows" / "deploy.yml"
)
CLASSIFY_DEPLOY_SCRIPT = (
    Path(__file__).resolve().parents[2] / "scripts" / "classify-deploy-changes.sh"
)
PRODUCTION_API_ENDPOINT_PATH = (
    Path(__file__).resolve().parents[2] / "frontend" / "production-api-endpoint.txt"
)
DEPLOY_WORKFLOW = DEPLOY_WORKFLOW_PATH.read_text(encoding="utf-8")
BOOTSTRAP_TERRAFORM_PATH = (
    Path(__file__).resolve().parents[1] / "infra" / "bootstrap" / "main.tf"
)
APP_TERRAFORM_DIR = Path(__file__).resolve().parents[1] / "infra" / "terraform"
WORKLOAD_ROLES = {
    "lambda",
    "weekly_report",
    "weekly_report_scheduler",
    "rag_knowledge_base",
    "rag_reindex",
}
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


def app_resources(resource_type: str) -> dict[str, dict]:
    resources: dict[str, dict] = {}
    for path in sorted(APP_TERRAFORM_DIR.glob("*.tf")):
        with path.open(encoding="utf-8") as terraform:
            root = hcl2.load(terraform)
        for block in root.get("resource", []):
            for kind, named in block.items():
                if kind.strip('"') == resource_type:
                    resources.update(
                        {name.strip('"'): body for name, body in named.items()}
                    )
    return resources


def statement_conditions(statement: dict) -> set[tuple[str, str, tuple[str, ...]]]:
    return {
        (
            condition["test"].strip('"'),
            condition["variable"].strip('"'),
            tuple(value.strip('"') for value in condition["values"]),
        )
        for condition in statement.get("condition", [])
    }


def test_production_workflow_routes_develop_changes_through_the_right_jobs() -> None:
    workflow = yaml.load(DEPLOY_WORKFLOW, Loader=yaml.BaseLoader)
    jobs = workflow["jobs"]

    assert workflow["on"]["push"]["branches"] == ["develop"]
    assert jobs["deploy-backend"]["needs"] == "verify-and-build"
    assert jobs["deploy-backend"]["if"] == (
        "${{ needs.verify-and-build.outputs.backend == 'true' }}"
    )
    assert jobs["deploy-backend"]["environment"] == {"name": "aws-production"}
    assert set(jobs["publish-site"]["needs"]) == {
        "verify-and-build",
        "deploy-backend",
    }
    assert "needs.verify-and-build.outputs.frontend == 'true'" in jobs[
        "publish-site"
    ]["if"]
    assert "needs.deploy-backend.result == 'success'" in jobs["publish-site"]["if"]
    assert "needs.deploy-backend.result == 'skipped'" in jobs["publish-site"]["if"]


def git_run(cwd: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=cwd, text=True, capture_output=True, check=True
    )
    return result.stdout.strip()


def init_deploy_routing_repo(path: Path) -> str:
    git_run(path, "init", "--quiet", "-b", "develop")
    git_run(path, "config", "user.name", "Deployment routing test")
    git_run(path, "config", "user.email", "routing@example.invalid")
    (path / "README.md").write_text("start\n", encoding="utf-8")
    git_run(path, "add", "-A")
    git_run(path, "commit", "--quiet", "-m", "base")
    return git_run(path, "rev-parse", "HEAD")


def make_routing_commit(path: Path, changes: dict[str, str | None], message: str) -> str:
    for relative, content in changes.items():
        target = path / relative
        if content is None:
            target.unlink(missing_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
    git_run(path, "add", "-A")
    git_run(path, "commit", "--quiet", "-m", message)
    return git_run(path, "rev-parse", "HEAD")


def classify_deploy_changes(path: Path, baseline: str, current: str) -> dict[str, str]:
    output = path / "github-output.txt"
    environment = {**os.environ, "GITHUB_OUTPUT": str(output)}
    result = subprocess.run(
        ["bash", str(CLASSIFY_DEPLOY_SCRIPT), baseline, current],
        cwd=path,
        env=environment,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    return dict(line.split("=", 1) for line in output.read_text().splitlines())


@pytest.mark.parametrize(
    ("changes", "expected"),
    [
        ({"frontend/pages/about.html": "updated\n"}, {"backend": "false", "frontend": "true"}),
        ({"backend/src/app.py": "updated\n"}, {"backend": "true", "frontend": "false"}),
        ({"backend/infra/terraform/main.tf": "updated\n"}, {"backend": "true", "frontend": "false"}),
        ({"frontend/production-api-endpoint.txt": "https://new.example/chat\n"}, {"backend": "true", "frontend": "true"}),
        ({"backend/tests/test_app.py": "updated\n", "docs/notes.md": "updated\n"}, {"backend": "false", "frontend": "false"}),
        ({"frontend/build.py": "updated\n", "backend/src/app.py": "updated\n"}, {"backend": "true", "frontend": "true"}),
    ],
)
def test_deploy_routing_for_frontend_backend_mixed_and_nonproduction_changes(
    tmp_path: Path, changes: dict[str, str | None], expected: dict[str, str]
) -> None:
    baseline = init_deploy_routing_repo(tmp_path)
    current = make_routing_commit(tmp_path, changes, "change files")

    assert classify_deploy_changes(tmp_path, baseline, current) == expected


def test_deploy_routing_catches_deletions_and_changes_across_multiple_commits(
    tmp_path: Path,
) -> None:
    baseline = init_deploy_routing_repo(tmp_path)
    make_routing_commit(
        tmp_path,
        {"backend/src/old.py": "to be removed\n"},
        "add backend file",
    )
    current = make_routing_commit(
        tmp_path,
        {"backend/src/old.py": None, "frontend/assets/css/site.css": "new\n"},
        "delete backend and add frontend",
    )

    assert classify_deploy_changes(tmp_path, baseline, current) == {
        "backend": "true",
        "frontend": "true",
    }


@pytest.mark.parametrize("baseline", ["", "missing-commit"])
def test_deploy_routing_fails_closed_when_release_baseline_is_unavailable(
    tmp_path: Path, baseline: str
) -> None:
    init_deploy_routing_repo(tmp_path)
    current = make_routing_commit(
        tmp_path, {"docs/notes.md": "documentation only\n"}, "docs",
    )

    assert classify_deploy_changes(tmp_path, baseline, current) == {
        "backend": "true",
        "frontend": "true",
    }


def test_production_endpoint_is_the_reviewed_https_chat_endpoint() -> None:
    endpoint = PRODUCTION_API_ENDPOINT_PATH.read_text(encoding="utf-8").strip()
    parsed = urlsplit(endpoint)

    assert parsed.scheme == "https"
    assert parsed.hostname is not None
    assert parsed.hostname.endswith(".execute-api.us-east-1.amazonaws.com")
    assert parsed.path == "/chat"
    assert not parsed.query and not parsed.fragment


def test_chat_api_is_protected_from_accidental_terraform_replacement() -> None:
    api = app_resources("aws_apigatewayv2_api")["chatbot"]

    assert api["lifecycle"][0]["prevent_destroy"] is True


def test_every_workload_role_carries_the_permissions_boundary() -> None:
    roles = app_resources("aws_iam_role")

    assert set(roles) == WORKLOAD_ROLES
    for role in roles.values():
        assert role["permissions_boundary"] == "${local.workload_boundary_arn}"


@pytest.mark.parametrize(
    "action",
    [
        "iam:AttachRolePolicy",
        "iam:CreatePolicyVersion",
        "iam:DeleteRole",
        "iam:DeleteRolePermissionsBoundary",
        "iam:UpdateAssumeRolePolicy",
    ],
)
def test_deploy_role_cannot_rewrite_trust_or_escape_the_boundary(action: str) -> None:
    assert not deploy_role_statements_granting(action)


def test_deploy_permissions_are_split_into_scoped_managed_policies() -> None:
    with BOOTSTRAP_TERRAFORM_PATH.open(encoding="utf-8") as terraform:
        root = hcl2.load(terraform)
    groups = root["locals"][0]["github_deploy_policy_groups"]
    grouped_sids = [sid.strip('"') for group in groups.values() for sid in group]
    documents = {
        name.strip('"'): body
        for block in root["data"]
        for kind, named in block.items()
        if kind.strip('"') == "aws_iam_policy_document"
        for name, body in named.items()
    }
    policy_sids = {
        statement["sid"].strip('"')
        for statement in documents["github_deploy"]["statement"]
    }
    resources = {
        kind.strip('"'): {name.strip('"'): body for name, body in named.items()}
        for block in root["resource"]
        for kind, named in block.items()
    }

    assert len(groups) == 4
    assert len(grouped_sids) == len(set(grouped_sids))
    assert set(grouped_sids) == policy_sids
    assert "github_deploy" in resources["aws_iam_policy"]
    assert "github_deploy" in resources["aws_iam_role_policy_attachment"]
    assert "github_deploy" not in resources.get("aws_iam_role_policy", {})


@pytest.mark.parametrize(
    "action",
    [
        "iam:CreateRole",
        "iam:DeleteRolePolicy",
        "iam:PutRolePermissionsBoundary",
        "iam:PutRolePolicy",
    ],
)
def test_deploy_role_changes_roles_only_under_the_boundary(action: str) -> None:
    statements = deploy_role_statements_granting(action)

    assert statements
    for statement in statements:
        assert statement_conditions(statement) == {
            (
                "ArnEquals",
                "iam:PermissionsBoundary",
                ("${local.workload_boundary_arn}",),
            )
        }


@pytest.mark.parametrize("action", ["iam:TagRole", "iam:UntagRole"])
def test_deploy_role_can_tag_only_managed_workload_roles(action: str) -> None:
    statements = deploy_role_statements_granting(action)

    assert len(statements) == 1
    assert not statement_conditions(statements[0])
    assert set(statements[0]["resources"]) == {
        "${local.lambda_role_arn}",
        "${local.report_lambda_role}",
        "${local.scheduler_role_arn}",
        "${local.rag_kb_role_arn}",
        "${local.rag_reindex_role_arn}",
    }


def test_deploy_role_binds_api_mutations_and_event_mappings_to_portfolio() -> None:
    api_statements = deploy_role_statements_granting("apigateway:DELETE")
    assert len(api_statements) == 1
    assert statement_conditions(api_statements[0]) == {
        ("StringEquals", "aws:ResourceTag/Project", ("personal-portfolio-chatbot",))
    }

    mapping_statements = deploy_role_statements_granting("lambda:CreateEventSourceMapping")
    assert len(mapping_statements) == 1
    assert mapping_statements[0]["resources"] == ["${local.rag_event_source_mapping_arn}"]
    assert statement_conditions(mapping_statements[0]) == {
        ("ArnEquals", "lambda:FunctionArn", ("${local.rag_reindex_lambda_arn}",))
    }

    mapping_tag_reads = [
        statement
        for statement in deploy_role_statements_granting("lambda:ListTags")
        if statement["sid"] == '"ReadRagEventSourceMappingTags"'
    ]
    assert len(mapping_tag_reads) == 1
    assert mapping_tag_reads[0]["sid"] == '"ReadRagEventSourceMappingTags"'
    assert mapping_tag_reads[0]["resources"] == [
        "${local.rag_event_source_mapping_arn}"
    ]
    assert not statement_conditions(mapping_tag_reads[0])
    for action in ("lambda:TagResource", "lambda:UntagResource"):
        assert all(
            "${local.rag_event_source_mapping_arn}" not in statement["resources"]
            for statement in deploy_role_statements_granting(action)
        )


def test_caller_rate_limit_table_is_keyed_by_caller_window_and_expires() -> None:
    table = app_resources("aws_dynamodb_table")["caller_rate_limit"]

    assert table["hash_key"] == '"callerWindow"'
    assert table["ttl"][0]["attribute_name"] == '"expiresAt"'
    assert table["ttl"][0]["enabled"] is True


def test_deploy_role_can_configure_ttl_only_on_usage_tables() -> None:
    statements = deploy_role_statements_granting("dynamodb:UpdateTimeToLive")

    assert len(statements) == 1
    assert set(statements[0]["resources"]) == {
        "${local.usage_table_arn}",
        "${local.rate_limit_table_arn}",
    }


def test_deployment_checks_required_email_and_aws_bootstrap_before_oidc() -> None:
    secret_check = DEPLOY_WORKFLOW.index('echo "::error::Set the WEEKLY_REPORT_EMAIL')
    oidc_credentials = DEPLOY_WORKFLOW.index(
        "aws-actions/configure-aws-credentials@"
    )

    assert 'if [[ -z "$AWS_ROLE_ARN" || -z "$TF_STATE_BUCKET" ]]' in DEPLOY_WORKFLOW
    assert secret_check < oidc_credentials
    assert "id-token: write" in DEPLOY_WORKFLOW


def test_deployment_checks_the_api_health_route_before_publishing_pages() -> None:
    workflow = yaml.load(DEPLOY_WORKFLOW, Loader=yaml.BaseLoader)
    backend_steps = workflow["jobs"]["deploy-backend"]["steps"]
    health_check = next(
        index
        for index, step in enumerate(backend_steps)
        if step.get("name") == "Check the deployed API health route"
    )
    assert health_check == len(backend_steps) - 1
    assert "deploy-backend" in workflow["jobs"]["publish-site"]["needs"]


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
        (
            "bedrock:ListTagsForResource",
            {"${local.rag_knowledge_base_arn}"},
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


def test_lambda_code_signing_config_reads_are_scoped_to_managed_functions() -> None:
    statements = deploy_role_statements_granting(
        "lambda:GetFunctionCodeSigningConfig"
    )

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


@pytest.mark.parametrize(
    "action",
    ["lambda:ListTags", "lambda:TagResource", "lambda:UntagResource"],
)
def test_event_source_mapping_tag_permissions_are_scoped(
    action: str,
) -> None:
    statements = deploy_role_statements_granting(action)

    assert statements
    resources = {
        resource
        for statement in statements
        for resource in statement["resources"]
    }
    expected_resources = {
        "${local.lambda_arn}",
        "${local.report_lambda_arn}",
        "${local.rag_reindex_lambda_arn}",
    }
    if action == "lambda:ListTags":
        expected_resources.add("${local.rag_event_source_mapping_arn}")
    assert resources == expected_resources
    assert all(len(statement["resources"]) == 1 for statement in statements)
