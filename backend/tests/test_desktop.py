import sys
import types
import urllib.request

import pytest

from lap_analyzer import desktop


def test_free_port_is_usable():
    port = desktop._free_port()
    assert 0 < port < 65536


def test_wait_until_up_returns_when_server_answers(monkeypatch):
    calls = []

    class Resp:
        def close(self):
            calls.append("closed")

    def fake_urlopen(url, timeout):
        if len(calls) == 0 and not hasattr(fake_urlopen, "failed"):
            fake_urlopen.failed = True
            raise OSError("not yet")
        return Resp()

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(desktop.time, "sleep", lambda s: None)
    desktop._wait_until_up("http://x/api/health")
    assert calls == ["closed"]


def test_wait_until_up_times_out(monkeypatch):
    def refuse(url, timeout):
        raise OSError("down")

    clock = iter([0.0, 0.0, 1.0, 2.0, 100.0])
    monkeypatch.setattr(urllib.request, "urlopen", refuse)
    monkeypatch.setattr(desktop.time, "monotonic", lambda: next(clock))
    monkeypatch.setattr(desktop.time, "sleep", lambda s: None)
    with pytest.raises(RuntimeError, match="did not start"):
        desktop._wait_until_up("http://x", timeout=5)


def test_main_exits_when_frontend_not_built(monkeypatch):
    monkeypatch.setitem(sys.modules, "webview", types.ModuleType("webview"))
    monkeypatch.setattr(desktop, "_frontend_dir", lambda: None)
    with pytest.raises(SystemExit, match="Frontend not built"):
        desktop.main()


def test_main_starts_server_opens_window_and_shuts_down(monkeypatch, tmp_path):
    events = []
    webview = types.ModuleType("webview")
    webview.create_window = lambda *a, **kw: events.append(("window", a, kw))
    webview.start = lambda: events.append(("start",))
    monkeypatch.setitem(sys.modules, "webview", webview)

    class FakeServer:
        should_exit = False

        def __init__(self, config):
            events.append(("config", config.host, config.port))

        def run(self):
            events.append(("run",))

    monkeypatch.setattr(desktop.uvicorn, "Server", FakeServer)
    monkeypatch.setattr(desktop, "_frontend_dir", lambda: tmp_path)
    monkeypatch.setattr(desktop, "_wait_until_up", lambda url: events.append(("wait", url)))
    # Run the server thread inline so the test is deterministic.
    monkeypatch.setattr(
        desktop.threading,
        "Thread",
        lambda target, daemon: types.SimpleNamespace(start=target),
    )

    desktop.main()

    kinds = [e[0] for e in events]
    assert kinds == ["config", "run", "wait", "window", "start"]
    assert events[0][1] == "127.0.0.1"
    assert events[2][1].endswith("/api/health")
    assert events[3][1][1].startswith("http://127.0.0.1:")
