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
    form = (
        '<form class="contact-form" id="contact-form" '
        'action="https://api.web3forms.com/submit" method="POST" novalidate>'
        "contact=__WEB3FORMS_KEY__</form>"
    )
    page_body = (
        '<meta http-equiv="Content-Security-Policy" content="connect-src \'self\' '
        '__CHATBOT_CONNECT_ORIGIN__;">' + form + "<!-- ASSISTANT_PANEL --><!-- CHATBOT_SCRIPTS -->"
    )
    (root / "index.html").write_text(page_body, encoding="utf-8")
    for page in ("about", "games"):
        path = root / "pages" / f"{page}.html"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(page_body, encoding="utf-8")
    (root / "assistant-panel.html").write_text(
        '<section data-chatbot-disabled><p data-assistant-offline>Offline</p></section>'
        '<section data-chatbot-active hidden><p data-assistant-live hidden>Live</p></section>',
        encoding="utf-8",
    )

    files = {
        "assets/css/main.css": "site styles",
        "assets/js/app.js": "site behavior",
        "assets/js/chatbot.js": "legacy chat client",
        "assets/js/chatbot.config.js": "private local config",
        "assets/js/chatbot.config.template.js": (
            "window.CHATBOT_CONFIG = { apiEndpoint: __CHATBOT_API_ENDPOINT__ };"
        ),
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
        page = (output / built).read_text(encoding="utf-8")
        assert (
            '<form class="contact-form" id="contact-form" '
            'action="https://api.web3forms.com/submit" method="POST" novalidate>'
            "contact=key&amp;&lt;&gt;&quot;</form>"
        ) in page
        assert "Offline" in page
        assert "__CHATBOT_CONNECT_ORIGIN__" not in page
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
    assert not (output / "assets/js/chatbot.js").exists()
    assert "data-chatbot-disabled" in (output / "index.html").read_text(encoding="utf-8")


def test_build_site_enables_chatbot_only_with_validated_public_endpoint(tmp_path: Path) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)

    build_site_module.build_site(
        source,
        output,
        environment={
            "WEB3FORMS_KEY": "test-key",
            "CHATBOT_API_ENDPOINT": "https://example.execute-api.us-east-1.amazonaws.com/chat",
        },
    )

    page = (output / "index.html").read_text(encoding="utf-8")
    config = (output / "assets/js/chatbot.config.js").read_text(encoding="utf-8")
    assert "https://example.execute-api.us-east-1.amazonaws.com" in page
    assert "https://example.execute-api.us-east-1.amazonaws.com/chat" in config
    assert "data-chatbot-disabled hidden" in page
    assert "data-chatbot-active>" in page
    assert "assets/js/chatbot.config.js" in page
    assert "assets/js/chatbot.js" in page
    assert (output / "assets/js/chatbot.js").is_file()
    assert not (output / "assets/js/chatbot.config.template.js").exists()


@pytest.mark.parametrize(
    "endpoint",
    [
        "http://example.com/chat",
        "https://example.com/",
        "https://example.com/chat?key=secret",
        "https://user:pass@example.com/chat",
    ],
)
def test_build_site_rejects_unsafe_or_malformed_chatbot_endpoint(endpoint: str) -> None:
    with pytest.raises(ValueError, match="CHATBOT_API_ENDPOINT"):
        build_site_module.resolve_chatbot_endpoint({"CHATBOT_API_ENDPOINT": endpoint})


def test_build_site_uses_the_public_contact_key_by_default(tmp_path: Path) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)

    build_site_module.build_site(source, output, environment={"WEB3FORMS_KEY": ""})

    page = (output / "index.html").read_text(encoding="utf-8")
    assert build_site_module.PUBLIC_WEB3FORMS_KEY in page
    assert "__WEB3FORMS_KEY__" not in page


def test_build_site_uses_direct_email_contact_when_the_form_is_off(
    tmp_path: Path, capsys
) -> None:
    source = tmp_path / "repo"
    output = tmp_path / "dist"
    create_source_tree(source)

    build_site_module.build_site(source, output, environment={"WEB3FORMS_KEY": "off"})

    for page_path in ("index.html", "pages/about.html", "pages/games.html"):
        page = (output / page_path).read_text(encoding="utf-8")
        assert "__WEB3FORMS_KEY__" not in page
        assert '<form class="contact-form"' not in page
        assert 'href="mailto:rickylenmartin@gmail.com"' in page
    assert "using the direct email contact link" in capsys.readouterr().out
