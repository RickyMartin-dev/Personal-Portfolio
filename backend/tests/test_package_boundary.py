from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]


def test_lambda_image_context_excludes_repo_and_dev_files() -> None:
    dockerfile = (BACKEND_ROOT / "Dockerfile").read_text(encoding="utf-8")
    dockerignore = (BACKEND_ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines()

    assert "*" in dockerignore
    assert "!requirements.txt" in dockerignore
    assert "!src/" in dockerignore
    assert "!src/**" in dockerignore
    assert "COPY requirements.txt" in dockerfile
    assert "COPY src/" in dockerfile
    assert "COPY ." not in dockerfile
    assert "requirements-dev.txt" not in dockerignore
