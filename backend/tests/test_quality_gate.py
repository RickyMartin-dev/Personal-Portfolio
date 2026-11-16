"""Regression tests for fail-closed handling in the required CI merge gate."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[2]
GATE_SCRIPT = PROJECT_ROOT / "scripts" / "require-quality-checks.sh"
STATUS_CASES = json.loads(
    (Path(__file__).parent / "fixtures" / "ci-failure-modes.json").read_text(
        encoding="utf-8"
    )
)


def run_gate(status: str) -> subprocess.CompletedProcess[str]:
    environment = os.environ.copy()
    environment.update(
        {
            "STARTER_SECURITY_RESULT": status,
            "BACKEND_RESULT": "success",
            "FRONTEND_RESULT": "success",
            "TERRAFORM_RESULT": "success",
        }
    )
    return subprocess.run(
        ["bash", str(GATE_SCRIPT)],
        cwd=PROJECT_ROOT,
        env=environment,
        text=True,
        capture_output=True,
        check=False,
    )


def test_merge_gate_accepts_only_all_successful_required_jobs() -> None:
    result = run_gate(STATUS_CASES["accepted_status"])

    assert result.returncode == 0


@pytest.mark.parametrize("status", STATUS_CASES["rejected_statuses"])
def test_merge_gate_rejects_non_success_required_job_statuses(status: str) -> None:
    result = run_gate(status)

    assert result.returncode != 0
    assert f"STARTER_SECURITY finished with '{status}'" in result.stdout
