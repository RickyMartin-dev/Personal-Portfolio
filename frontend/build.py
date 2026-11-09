#!/usr/bin/env python3
"""Build the small static Pages artifact without copying backend or repo tooling."""

from __future__ import annotations

import html
import json
import os
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
    "chatbot.config.template.js",
)
BUILD_IGNORES = shutil.ignore_patterns(".DS_Store")


def build_site(
    root: Path = ROOT,
    output: Path = OUTPUT,
    *,
    environment: Mapping[str, str] | None = None,
) -> None:
    env = os.environ if environment is None else environment
    endpoint = env.get("CHATBOT_API_ENDPOINT", "").strip()
    if not endpoint.startswith("https://") and not endpoint.startswith("http://127.0.0.1:"):
        raise SystemExit("CHATBOT_API_ENDPOINT must be an HTTPS production URL or local loopback URL")

    shutil.rmtree(output, ignore_errors=True)
    output.mkdir(parents=True)
    for source in ("index.html", "pages", "assets", "images"):
        path = root / source
        if path.is_dir():
            ignore = ASSET_BUILD_IGNORES if source == "assets" else BUILD_IGNORES
            shutil.copytree(path, output / source, ignore=ignore)
        else:
            shutil.copy2(path, output / source)

    (output / "assets/js/chatbot.config.js").write_text(
        "window.CHATBOT_CONFIG = "
        + json.dumps({"apiEndpoint": endpoint}, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )

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
    elif "__WEB3FORMS_KEY__" in "".join(
        (output / "pages" / name).read_text(encoding="utf-8")
        for name in ("index.html", "about.html", "elements.html")
        if (output / "pages" / name).exists()
    ):
        print("warning: WEB3FORMS_KEY is unset; the published contact form will not submit")

    print(f"Built static site in {output}")


def main() -> None:
    build_site()


if __name__ == "__main__":
    main()
