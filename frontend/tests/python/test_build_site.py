from __future__ import annotations

import importlib.util
from pathlib import Path


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
        "assets/js/site.js": "site behavior",
        "assets/js/chatbot-notice.js": "under construction notice",
        "assets/js/chatbot.js": "legacy chat client",
        "assets/js/chatbot.config.js": "private local config",
        "assets/js/chatbot.config.template.js": "config template",
        "assets/js/main.js": "legacy template code",
        "assets/css/noscript.css": "unused stylesheet",
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


def test_build_site_contains_only_static_frontend_and_escapes_contact_key(
    tmp_path: Path,
) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)

    build_site_module.build_site(
        source,
        output,
        environment={"WEB3FORMS_KEY": 'key&<>"'},
    )

    assert (output / "pages/about.html").read_text(encoding="utf-8") == (
        "contact=key&amp;&lt;&gt;&quot;"
    )
    assert (output / "assets/js/site.js").is_file()
    assert (output / "assets/js/chatbot-notice.js").is_file()
    assert (output / "images/profile.svg").is_file()

    for excluded in (
        "README.md",
        "backend",
        "infra",
        "assets/js/chatbot.js",
        "assets/js/chatbot.config.js",
        "assets/js/chatbot.config.template.js",
        "assets/js/main.js",
        "assets/css/noscript.css",
        "assets/sass",
    ):
        assert not (output / excluded).exists(), excluded


def test_build_site_needs_no_chatbot_or_aws_configuration(tmp_path: Path) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)
    output.mkdir()
    (output / "old-artifact").write_text("replace me", encoding="utf-8")

    build_site_module.build_site(source, output, environment={})

    assert (output / "index.html").read_text(encoding="utf-8") == "redirect"
    assert not (output / "old-artifact").exists()
    assert not (output / "assets/js/chatbot.config.js").exists()


def test_build_site_keeps_contact_form_unconfigured_without_a_key(
    tmp_path: Path, capsys
) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)

    build_site_module.build_site(source, output, environment={})

    page = (output / "pages/index.html").read_text(encoding="utf-8")
    assert "__WEB3FORMS_KEY__" in page
    assert "WEB3FORMS_KEY is unset" in capsys.readouterr().out
