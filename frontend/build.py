#!/usr/bin/env python3
"""Build the small static Pages artifact without copying backend or repo tooling."""

from __future__ import annotations

import html
import json
import os
import re
import shutil
from pathlib import Path
from typing import Mapping
from urllib.parse import urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "dist"

# Only source assets needed by the static pages are copied. Chat assets are
# copied only when a validated public endpoint is configured for the build.
BASE_ASSET_IGNORES = shutil.ignore_patterns(
    ".DS_Store", "chatbot.js", "chatbot.config.js", "chatbot.config.template.js"
)
ACTIVE_ASSET_IGNORES = shutil.ignore_patterns(
    ".DS_Store", "chatbot.config.js", "chatbot.config.template.js"
)
CONTACT_FORM = re.compile(
    r'<form class="contact-form"[^>]*?'
    r'action="https://api\.web3forms\.com/submit"[^>]*>.*?</form>',
    re.DOTALL,
)
BUILD_IGNORES = shutil.ignore_patterns(".DS_Store")


# Web3Forms access keys are public client identifiers: they ship in the page HTML
# and can only deliver mail to the owner's registered address. This is the key
# the site has used since launch. WEB3FORMS_KEY overrides it; WEB3FORMS_KEY=off
# swaps the form for a direct email link.
PUBLIC_WEB3FORMS_KEY = "ca3bcb6c-5284-4f18-971c-ee541cc36de8"


def resolve_contact_key(env: Mapping[str, str]) -> str:
    value = env.get("WEB3FORMS_KEY", "").strip()
    if value.lower() == "off":
        return ""
    return value or PUBLIC_WEB3FORMS_KEY


def resolve_chatbot_endpoint(env: Mapping[str, str]) -> tuple[str, str]:
    """Return a safe public /chat URL and its CSP origin, or two empty strings."""
    endpoint = env.get("CHATBOT_API_ENDPOINT", "").strip()
    if not endpoint:
        return "", ""
    parsed = urlsplit(endpoint)
    try:
        port = parsed.port
    except ValueError as error:
        raise ValueError("CHATBOT_API_ENDPOINT has an invalid port") from error
    hostname = (parsed.hostname or "").lower()
    is_local = hostname in {"localhost", "127.0.0.1"}
    if (
        parsed.scheme not in ({"https", "http"} if is_local else {"https"})
        or not hostname
        or parsed.username
        or parsed.password
        or parsed.path != "/chat"
        or parsed.query
        or parsed.fragment
        or (parsed.scheme == "http" and not is_local)
        or (port is not None and not 1 <= port <= 65535)
        or any(character.isspace() for character in endpoint)
    ):
        raise ValueError(
            "CHATBOT_API_ENDPOINT must be an HTTPS /chat URL (HTTP is allowed only for localhost)"
        )
    origin = urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))
    return endpoint, origin


def site_pages(output: Path) -> list[Path]:
    """Every built HTML page (home plus pages/*.html) that may hold the contact form."""
    return [output / "index.html", *sorted((output / "pages").glob("*.html"))]


def build_site(
    root: Path = ROOT,
    output: Path = OUTPUT,
    *,
    environment: Mapping[str, str] | None = None,
) -> None:
    env = os.environ if environment is None else environment
    chatbot_endpoint, chatbot_origin = resolve_chatbot_endpoint(env)
    shutil.rmtree(output, ignore_errors=True)
    output.mkdir(parents=True)
    for source in ("index.html", "pages", "assets", "images"):
        path = root / source
        if path.is_dir():
            ignore = (
                ACTIVE_ASSET_IGNORES if chatbot_endpoint else BASE_ASSET_IGNORES
            ) if source == "assets" else BUILD_IGNORES
            shutil.copytree(path, output / source, ignore=ignore)
        else:
            shutil.copy2(path, output / source)

    panel = (root / "assistant-panel.html").read_text(encoding="utf-8")
    if chatbot_endpoint:
        config = (root / "assets/js/chatbot.config.template.js").read_text(encoding="utf-8")
        if "__CHATBOT_API_ENDPOINT__" not in config:
            raise ValueError("chatbot config template is missing its endpoint marker")
        config = config.replace("__CHATBOT_API_ENDPOINT__", json.dumps(chatbot_endpoint))
        config_path = output / "assets" / "js" / "chatbot.config.js"
        config_path.parent.mkdir(parents=True, exist_ok=True)
        config_path.write_text(config, encoding="utf-8")

    for page in site_pages(output):
        source = page.read_text(encoding="utf-8")
        source = source.replace("<!-- ASSISTANT_PANEL -->", panel)
        source = source.replace(
            "__CHATBOT_CONNECT_ORIGIN__", html.escape(chatbot_origin, quote=True)
        )
        if chatbot_endpoint:
            prefix = "../" if page.parent.name == "pages" else ""
            scripts = (
                f'<script src="{prefix}assets/js/chatbot.config.js"></script>\n'
                f'<script src="{prefix}assets/js/chatbot.js"></script>'
            )
            source = source.replace("<!-- CHATBOT_SCRIPTS -->", scripts)
            source = source.replace(
                'data-chatbot-disabled>', 'data-chatbot-disabled hidden>'
            ).replace('data-chatbot-active hidden>', 'data-chatbot-active>')
            source = source.replace(
                'data-assistant-offline>', 'data-assistant-offline hidden>'
            ).replace('data-assistant-live hidden>', 'data-assistant-live>')
        else:
            source = source.replace("<!-- CHATBOT_SCRIPTS -->", "")
        page.write_text(source, encoding="utf-8")

    contact_key = resolve_contact_key(env)
    if contact_key:
        for page in site_pages(output):
            page.write_text(
                page.read_text(encoding="utf-8").replace(
                    "__WEB3FORMS_KEY__", html.escape(contact_key, quote=True)
                ),
                encoding="utf-8",
            )
    else:
        fallback = (
            '<p class="contact-form-fallback">Reach out by email at '
            '<a href="mailto:rickylenmartin@gmail.com">'
            "rickylenmartin@gmail.com</a>.</p>"
        )
        for page in site_pages(output):
            page.write_text(
                CONTACT_FORM.sub(fallback, page.read_text(encoding="utf-8")),
                encoding="utf-8",
            )
        print("info: WEB3FORMS_KEY=off; using the direct email contact link")

    print(f"Built static site in {output}")


def main() -> None:
    build_site()


if __name__ == "__main__":
    main()
