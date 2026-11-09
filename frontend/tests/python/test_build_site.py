from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
BUILD_SCRIPT = REPO_ROOT / "build.py"
SPEC = importlib.util.spec_from_file_location("build_site", BUILD_SCRIPT)
assert SPEC is not None and SPEC.loader is not None
build_site_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(build_site_module)


def create_source_tree(root: Path) -> None:
    root.mkdir(parents=True)
    (root / "index.html").write_text("redirect", encoding="utf-8")
    for page in ("index", "about", "elements"):
        path = root / "pages" / f"{page}.html"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("contact=__WEB3FORMS_KEY__", encoding="utf-8")

    files = {
        "assets/css/main.css": "site styles",
        "assets/js/chatbot.js": "chat widget",
        "assets/js/main.js": "legacy template code",
        "assets/js/chatbot.config.template.js": "template config",
        "assets/sass/main.scss": "unused sass",
        "images/profile.svg": "profile image",
        "README.md": "repo documentation",
        "backend/src/main.py": "backend source",
        "infra/main.tf": "terraform source",
    }
    for filename, content in files.items():
        path = root / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


def test_build_site_contains_only_frontend_and_injects_runtime_config(tmp_path: Path) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)

    build_site_module.build_site(
        source,
        output,
        environment={
            "CHATBOT_API_ENDPOINT": "https://api.example.test/chat",
            "WEB3FORMS_KEY": 'key&<>"',
        },
    )

    config = (output / "assets/js/chatbot.config.js").read_text(encoding="utf-8")
    assert config == (
        'window.CHATBOT_CONFIG = {"apiEndpoint":"https://api.example.test/chat"};\n'
    )
    assert "key" not in config
    assert (output / "pages/about.html").read_text(encoding="utf-8") == (
        "contact=key&amp;&lt;&gt;&quot;"
    )
    assert (output / "assets/js/chatbot.js").is_file()
    assert (output / "images/profile.svg").is_file()

    for excluded in (
        "README.md",
        "backend",
        "infra",
        "assets/js/main.js",
        "assets/js/chatbot.config.template.js",
        "assets/sass",
    ):
        assert not (output / excluded).exists(), excluded


def test_build_site_requires_https_or_local_loopback_before_replacing_output(
    tmp_path: Path,
) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)
    output.mkdir()
    marker = output / "keep-me"
    marker.write_text("existing artifact", encoding="utf-8")

    with pytest.raises(SystemExit, match="CHATBOT_API_ENDPOINT"):
        build_site_module.build_site(
            source,
            output,
            environment={"CHATBOT_API_ENDPOINT": "http://example.test/chat"},
        )

    assert marker.read_text(encoding="utf-8") == "existing artifact"


def test_build_site_keeps_contact_form_unconfigured_without_a_key(
    tmp_path: Path, capsys
) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)

    build_site_module.build_site(
        source,
        output,
        environment={"CHATBOT_API_ENDPOINT": "http://127.0.0.1:8000/chat"},
    )

    page = (output / "pages/index.html").read_text(encoding="utf-8")
    assert "__WEB3FORMS_KEY__" in page
    assert "WEB3FORMS_KEY is unset" in capsys.readouterr().out
