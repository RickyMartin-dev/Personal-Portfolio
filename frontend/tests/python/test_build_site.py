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
    form = (
        '<form class="contact-form" id="contact-form" '
        'action="https://api.web3forms.com/submit" method="POST" novalidate>'
        "contact=__WEB3FORMS_KEY__</form>"
    )
    (root / "index.html").write_text(form, encoding="utf-8")
    for page in ("about", "games"):
        path = root / "pages" / f"{page}.html"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(form, encoding="utf-8")

    files = {
        "assets/css/main.css": "site styles",
        "assets/js/app.js": "site behavior",
        "assets/js/chatbot.js": "legacy chat client",
        "assets/js/chatbot.config.js": "private local config",
        "assets/js/chatbot.config.template.js": "config template",
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

    for built in ("index.html", "pages/about.html", "pages/games.html"):
        assert (output / built).read_text(encoding="utf-8") == (
            '<form class="contact-form" id="contact-form" '
            'action="https://api.web3forms.com/submit" method="POST" novalidate>'
            "contact=key&amp;&lt;&gt;&quot;</form>"
        )
    assert (output / "assets/js/app.js").is_file()
    assert (output / "images/profile.svg").is_file()

    for excluded in (
        "README.md",
        "backend",
        "infra",
        "assets/js/chatbot.js",
        "assets/js/chatbot.config.js",
        "assets/js/chatbot.config.template.js",
    ):
        assert not (output / excluded).exists(), excluded


def test_build_site_needs_no_chatbot_or_aws_configuration(tmp_path: Path) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)
    output.mkdir()
    (output / "old-artifact").write_text("replace me", encoding="utf-8")

    build_site_module.build_site(source, output, environment={})

    assert (output / "index.html").is_file()
    assert not (output / "old-artifact").exists()
    assert not (output / "assets/js/chatbot.config.js").exists()


def test_build_site_uses_direct_email_contact_without_a_key(
    tmp_path: Path, capsys
) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)

    build_site_module.build_site(source, output, environment={})

    for page_path in ("index.html", "pages/about.html", "pages/games.html"):
        page = (output / page_path).read_text(encoding="utf-8")
        assert "__WEB3FORMS_KEY__" not in page
        assert '<form class="contact-form"' not in page
        assert 'href="mailto:rickylenmartin@gmail.com"' in page
    assert "using the direct email contact link" in capsys.readouterr().out
