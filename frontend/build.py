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

# Only the source folders needed by the static pages are copied. These files
# are useful to edit the original template but are not loaded by any page.
ASSET_BUILD_IGNORES = shutil.ignore_patterns(
    ".DS_Store",
    "sass",
    "main.js",
    "noscript.css",
    "chatbot.js",
    "chatbot.config.js",
    "chatbot.config.template.js",
)
CONTACT_FORM = re.compile(
    r'<form class="contact-form" '
    r'action="https://api\.web3forms\.com/submit" method="POST">.*?</form>',
    re.DOTALL,
)
BUILD_IGNORES = shutil.ignore_patterns(".DS_Store")


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

    contact_key = env.get("WEB3FORMS_KEY", "").strip()
    if contact_key:
        for page_name in ("index.html", "about.html", "elements.html"):
            page = output / "pages" / page_name
            if page.exists():
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
        for page_name in ("index.html", "about.html", "elements.html"):
            page = output / "pages" / page_name
            if page.exists():
                page.write_text(
                    CONTACT_FORM.sub(fallback, page.read_text(encoding="utf-8")),
                    encoding="utf-8",
                )
        print("info: WEB3FORMS_KEY is unset; using the direct email contact link")

    print(f"Built static site in {output}")


def main() -> None:
    build_site()


if __name__ == "__main__":
    main()
