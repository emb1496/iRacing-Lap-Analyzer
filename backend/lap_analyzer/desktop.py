"""Native desktop window: runs the API on a loopback port and shows the UI in a webview.

Run with: python -m lap_analyzer.desktop
"""

from __future__ import annotations

import socket
import threading
import time
import urllib.request

import uvicorn

from . import __version__
from .main import _frontend_dir, app


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _wait_until_up(url: str, timeout: float = 15.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1).close()
            return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError("backend did not start")


def main() -> None:
    import webview  # imported late so the API works without the desktop extra

    if _frontend_dir() is None:
        raise SystemExit("Frontend not built. Run `npm run build` in frontend/ first.")

    port = _free_port()
    server = uvicorn.Server(
        uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning", log_config=None)
    )
    threading.Thread(target=server.run, daemon=True).start()
    _wait_until_up(f"http://127.0.0.1:{port}/api/health")

    webview.create_window(
        f"Lap Analyzer {__version__}", f"http://127.0.0.1:{port}", width=1400, height=900
    )
    webview.start()  # blocks until the window closes
    server.should_exit = True


if __name__ == "__main__":
    main()
