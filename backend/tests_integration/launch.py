"""How the integration tests start the app (optionally under coverage)."""

from __future__ import annotations

import os
import socket
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]


def python_command() -> list[str]:
    """The interpreter command; wrapped in ``coverage run`` when LAP_SERVER_COVERAGE=1."""
    if os.environ.get("LAP_SERVER_COVERAGE") == "1":
        # --rcfile so a server started from another directory still uses this project's settings
        return [
            sys.executable,
            "-m",
            "coverage",
            "run",
            f"--rcfile={BACKEND_DIR / 'pyproject.toml'}",
        ]
    return [sys.executable]


def environment(**extra: str) -> dict[str, str]:
    env = dict(os.environ)
    # Absolute, because some servers run from another directory.
    data_file = env.get("COVERAGE_FILE", ".coverage.integration")
    env["COVERAGE_FILE"] = str(BACKEND_DIR / data_file)
    env.update(extra)
    return env


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]
