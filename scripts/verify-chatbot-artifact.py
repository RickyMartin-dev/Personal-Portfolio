#!/usr/bin/env python3
"""Verify the built Pages artifact contains the reviewed, active chatbot."""

from __future__ import annotations

import json
import posixpath
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


class PageContract(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.scripts: list[str] = []
        self.connect_sources: list[str] = []
        self.chatbot_is_visible = False
        self.disabled_notice_is_visible = False

    def handle_starttag(self, tag: str, values: list[tuple[str, str | None]]) -> None:
        attrs = {key.lower(): value or "" for key, value in values}
        if tag.lower() == "script" and attrs.get("src"):
            self.scripts.append(attrs["src"])
        if tag.lower() == "meta" and attrs.get("http-equiv", "").lower() == "content-security-policy":
            for directive in attrs.get("content", "").split(";"):
                parts = directive.split()
                if parts and parts[0].lower() == "connect-src":
                    self.connect_sources.extend(parts[1:])
        if "data-chatbot-active" in attrs and "hidden" not in attrs:
            self.chatbot_is_visible = True
        if "data-chatbot-disabled" in attrs and "hidden" not in attrs:
            self.disabled_notice_is_visible = True


def fail(message: str) -> None:
    raise SystemExit(f"chatbot artifact validation failed: {message}")


def main() -> None:
    if len(sys.argv) != 3:
        fail("usage: verify-chatbot-artifact.py <site-root> <endpoint-file>")

    site_root = Path(sys.argv[1]).resolve()
    endpoint = Path(sys.argv[2]).read_text(encoding="utf-8").strip()
    parsed = urlsplit(endpoint)
    try:
        port = parsed.port
    except ValueError:
        fail("tracked endpoint has an invalid port")
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.path != "/chat"
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or (port is not None and not 1 <= port <= 65535)
        or any(character.isspace() for character in endpoint)
    ):
        fail("tracked endpoint is not a valid HTTPS /chat URL")
    origin = f"{parsed.scheme}://{parsed.netloc}"

    config_path = site_root / "assets/js/chatbot.config.js"
    client_path = site_root / "assets/js/chatbot.js"
    if not config_path.is_file() or not client_path.is_file():
        fail("active client or endpoint configuration is missing")
    template_path = site_root.parent / "assets/js/chatbot.config.template.js"
    if not template_path.is_file():
        # CI runs this verifier after artifact download, where only dist is present.
        expected_config = (
            "// Public endpoint only; never put provider credentials in this browser config.\n"
            "window.CHATBOT_CONFIG = {\n  apiEndpoint: "
            f"{json.dumps(endpoint)}\n}};\n"
        )
    else:
        expected_config = template_path.read_text(encoding="utf-8").replace(
            "__CHATBOT_API_ENDPOINT__", json.dumps(endpoint)
        )
    if config_path.read_text(encoding="utf-8") != expected_config:
        fail("generated endpoint configuration does not exactly match the reviewed endpoint")

    pages = sorted(site_root.rglob("*.html"))
    if not pages:
        fail("no HTML pages were built")
    for page in pages:
        contract = PageContract()
        contract.feed(page.read_text(encoding="utf-8"))
        relative_parent = page.relative_to(site_root).parent.as_posix()
        scripts = {
            posixpath.normpath(posixpath.join(relative_parent, source))
            for source in contract.scripts
        }
        if not {"assets/js/chatbot.config.js", "assets/js/chatbot.js"}.issubset(scripts):
            fail(f"{page.relative_to(site_root)} does not load the active client")
        if not contract.chatbot_is_visible or contract.disabled_notice_is_visible:
            fail(f"{page.relative_to(site_root)} does not show the active chat panel")
        if origin not in contract.connect_sources:
            fail(f"{page.relative_to(site_root)} CSP does not allow the reviewed API origin")

    forbidden = (
        b"api.example.test",
        b"playwright-test-key",
        b"__CHATBOT_API_ENDPOINT__",
        b"__CHATBOT_CONNECT_ORIGIN__",
    )
    endpoint_bytes = endpoint.encode("utf-8")
    for path in site_root.rglob("*"):
        if not path.is_file():
            continue
        contents = path.read_bytes()
        if any(marker in contents for marker in forbidden):
            fail(f"test value or unresolved marker found in {path.relative_to(site_root)}")
        if endpoint_bytes in contents and path.resolve() != config_path.resolve():
            fail(f"reviewed endpoint appears outside chatbot.config.js: {path.relative_to(site_root)}")

    print("Active chatbot artifact verified against the reviewed endpoint and CSP.")


if __name__ == "__main__":
    main()
