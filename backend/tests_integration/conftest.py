"""Fixtures that launch the real app (uvicorn in a subprocess) and talk to it over HTTP."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from collections.abc import Iterator
from pathlib import Path

import httpx
import pytest

from lap_analyzer.synthetic import SyntheticSession, demo_session

BACKEND_DIR = Path(__file__).resolve().parents[1]


def server_python() -> list[str]:
    """The interpreter command; wrapped in ``coverage run`` when LAP_SERVER_COVERAGE=1."""
    if os.environ.get("LAP_SERVER_COVERAGE") == "1":
        return [sys.executable, "-m", "coverage", "run"]
    return [sys.executable]


def server_env() -> dict[str, str]:
    env = dict(os.environ)
    env.setdefault("COVERAGE_FILE", str(BACKEND_DIR / ".coverage.integration"))
    return env


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def server() -> Iterator[str]:
    """Base URL of a freshly launched ``uvicorn lap_analyzer.main:app``."""
    port = free_port()
    base = f"http://127.0.0.1:{port}"
    proc = subprocess.Popen(
        [
            *server_python(),
            "-m", "uvicorn", "lap_analyzer.main:app",
            "--host", "127.0.0.1", "--port", str(port), "--log-level", "warning",
        ],
        cwd=BACKEND_DIR,
        env=server_env(),
    )  # fmt: skip
    try:
        deadline = time.monotonic() + 30
        while True:
            if proc.poll() is not None:
                pytest.fail(f"server exited early with code {proc.returncode}")
            try:
                httpx.get(f"{base}/api/health", timeout=1).raise_for_status()
                break
            except httpx.HTTPError:
                if time.monotonic() > deadline:
                    pytest.fail("server did not become healthy within 30s")
                time.sleep(0.1)
        yield base
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


@pytest.fixture(scope="session")
def client(server: str) -> Iterator[httpx.Client]:
    with httpx.Client(base_url=server, timeout=30) as c:
        yield c


@pytest.fixture(scope="session")
def demo() -> SyntheticSession:
    return demo_session()
