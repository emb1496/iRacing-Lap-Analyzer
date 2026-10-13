"""The app and the desktop launcher when ``frontend/dist`` does not exist."""

from __future__ import annotations

import os
import shutil
import subprocess
import time
from pathlib import Path

import httpx
import pytest

from tests_integration.launch import BACKEND_DIR, environment, free_port, python_command

pytestmark = pytest.mark.integration


@pytest.fixture
def unbuilt_backend(tmp_path: Path) -> Path:
    """A copy of the package laid out so that ../frontend/dist (relative to it) is missing."""
    backend = tmp_path / "backend"
    backend.mkdir()
    shutil.copytree(
        BACKEND_DIR / "lap_analyzer",
        backend / "lap_analyzer",
        ignore=shutil.ignore_patterns("__pycache__"),
    )
    return backend


def _env(backend: Path) -> dict[str, str]:
    return environment(PYTHONPATH=str(backend))


def test_api_works_but_nothing_is_served_at_root(unbuilt_backend):
    port = free_port()
    proc = subprocess.Popen(
        [
            *python_command(), "-m", "uvicorn", "lap_analyzer.main:app",
            "--host", "127.0.0.1", "--port", str(port), "--log-level", "warning",
        ],
        cwd=unbuilt_backend,
        env=_env(unbuilt_backend),
    )  # fmt: skip
    base = f"http://127.0.0.1:{port}"
    try:
        deadline = time.monotonic() + 30
        while True:
            try:
                assert httpx.get(f"{base}/api/health", timeout=1).json()["status"] == "ok"
                break
            except httpx.HTTPError:
                assert proc.poll() is None and time.monotonic() < deadline
                time.sleep(0.1)
        assert httpx.get(f"{base}/").status_code == 404
    finally:
        proc.terminate()
        proc.wait(timeout=10)


def test_desktop_launcher_refuses_to_start_without_a_build(unbuilt_backend, tmp_path):
    (tmp_path / "webview.py").write_text("")  # imported before the build check
    env = environment(PYTHONPATH=f"{unbuilt_backend}{os.pathsep}{tmp_path}")
    proc = subprocess.run(
        [*python_command(), "-m", "lap_analyzer.desktop"],
        cwd=unbuilt_backend,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert proc.returncode == 1
    assert "Frontend not built" in proc.stderr
