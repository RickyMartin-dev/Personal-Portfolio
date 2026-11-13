#!/usr/bin/env python3
"""Build the small static Pages artifact without copying backend or repo tooling."""

from __future__ import annotations

import html
import os
import re
import shutil
from pathlib import Path
from typing import Mapping


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "dist"

# Only the source folders needed by the static pages are copied. The dormant
# chatbot client and its config are never published; the launcher is a notice.
ASSET_BUILD_IGNORES = shutil.ignore_patterns(
    ".DS_Store",
    "chatbot.js",
    "chatbot.config.js",
    "chatbot.config.template.js",
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
    shutil.rmtree(output, ignore_errors=True)
    output.mkdir(parents=True)
    for source in ("index.html", "pages", "assets", "images"):
        path = root / source
        if path.is_dir():
            ignore = ASSET_BUILD_IGNORES if source == "assets" else BUILD_IGNORES
            shutil.copytree(path, output / source, ignore=ignore)
        else:
            shutil.copy2(path, output / source)

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
