"""``python -m lap_analyzer.desktop`` end to end, with a stand-in for the native webview."""

from __future__ import annotations

import subprocess
import textwrap

import pytest

from lap_analyzer.main import _frontend_dir
from tests_integration.launch import BACKEND_DIR, environment, python_command

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(_frontend_dir() is None, reason="frontend not built (npm run build)"),
]

# pywebview needs a GUI toolkit, so stand in for it: "open" the window by fetching the page the
# way the webview would, and report what came back.
FAKE_WEBVIEW = textwrap.dedent(
    """
    import json, urllib.request

    _url = None

    def create_window(title, url, width, height):
        global _url
        _url = url
        print("TITLE", title, width, height, flush=True)

    def start():
        page = urllib.request.urlopen(_url, timeout=10).read().decode()
        health = json.load(urllib.request.urlopen(_url + "/api/health", timeout=10))
        print("PAGE", '<div id="root">' in page, flush=True)
        print("HEALTH", health["status"], flush=True)
    """
)


def test_desktop_window_serves_the_app(tmp_path):
    (tmp_path / "webview.py").write_text(FAKE_WEBVIEW)
    proc = subprocess.run(
        [*python_command(), "-m", "lap_analyzer.desktop"],
        cwd=BACKEND_DIR,
        env=environment(PYTHONPATH=str(tmp_path)),
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert proc.returncode == 0, proc.stderr
    lines = proc.stdout.splitlines()
    assert any(line.startswith("TITLE Lap Analyzer ") and "1400 900" in line for line in lines)
    assert "PAGE True" in lines
    assert "HEALTH ok" in lines
