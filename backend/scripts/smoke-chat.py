#!/usr/bin/env python3
"""Make one real, bounded inference request without printing chat content."""

from __future__ import annotations

import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def main() -> int:
    endpoint = os.environ.get("CHATBOT_API_ENDPOINT", "").strip()
    if not endpoint.startswith("https://"):
        print("smoke check requires an HTTPS deployed endpoint", file=sys.stderr)
        return 2

    payload = json.dumps(
        {"input": "What is one of Ricky's core skills?", "history": []}
    ).encode("utf-8")
    request = Request(
        endpoint,
        data=payload,
        headers={"content-type": "application/json", "accept": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=35) as response:
            if response.status != 200:
                print(f"deployed inference smoke check failed (HTTP {response.status})", file=sys.stderr)
                return 1
            result = json.loads(response.read().decode("utf-8"))
        if not isinstance(result, dict) or not isinstance(result.get("message"), str) or not result[
            "message"
        ].strip():
            print("deployed inference smoke check failed (invalid response)", file=sys.stderr)
            return 1
    except HTTPError as error:
        print(f"deployed inference smoke check failed (HTTP {error.code})", file=sys.stderr)
        return 1
    except (URLError, TimeoutError, json.JSONDecodeError):
        print("deployed inference smoke check failed (network, timeout, or invalid response)", file=sys.stderr)
        return 1

    print("deployed inference smoke check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
