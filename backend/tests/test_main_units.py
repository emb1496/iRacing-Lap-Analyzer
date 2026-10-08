import sys

import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from helpers import lap_channels, make_ibt

from lap_analyzer import main
from lap_analyzer.analysis import LapTrace
from lap_analyzer.ibt import write_ibt
from lap_analyzer.session import Session

YAML = "WeekendInfo:\n  TrackDisplayName: Other Track\n  TrackLength: 1 km\n"


@pytest.fixture
def client() -> TestClient:
    return TestClient(main.app)


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok" and body["version"]


def test_list_sessions_includes_loaded_demo(client):
    sid = client.post("/api/sessions/demo").json()["id"]
    assert sid in [s["id"] for s in client.get("/api/sessions").json()]


def test_upload_too_large(client, monkeypatch):
    monkeypatch.setattr(main, "MAX_UPLOAD_BYTES", 10)
    resp = client.post("/api/sessions", files={"file": ("big.ibt", b"x" * 11)})
    assert resp.status_code == 413


def test_upload_extension_check_is_case_insensitive(client, demo):
    resp = client.post("/api/sessions", files={"file": ("LAP.IBT", demo.ibt)})
    assert resp.status_code == 200


def test_upload_without_track_length_or_laps_is_422(client):
    data = write_ibt(lap_channels(laps=1))
    resp = client.post("/api/sessions", files={"file": ("short.ibt", data)})
    assert resp.status_code == 422
    assert "cannot determine track length" in resp.json()["detail"]


def test_compare_unknown_session_404(client):
    resp = client.get(
        "/api/compare",
        params={"ref_session": "nope", "ref_lap": 1, "cmp_session": "nope", "cmp_lap": 1},
    )
    assert resp.status_code == 404


def test_compare_different_tracks_400(client):
    demo_id = client.post("/api/sessions/demo").json()["id"]
    other = main.store.add(Session(make_ibt(YAML), "other.ibt"))
    resp = client.get(
        "/api/compare",
        params={"ref_session": demo_id, "ref_lap": 2, "cmp_session": other.id, "cmp_lap": 2},
    )
    assert resp.status_code == 400
    assert "different tracks" in resp.json()["detail"]


def test_compare_incomplete_lap_400(client):
    sid = client.post("/api/sessions/demo").json()["id"]
    session = main.store.get(sid)
    partial = next(lap.number for lap in session.laps if not lap.complete)
    resp = client.get(
        "/api/compare",
        params={"ref_session": sid, "ref_lap": 2, "cmp_session": sid, "cmp_lap": partial},
    )
    assert resp.status_code == 400


def test_compare_step_bounds_validated(client):
    resp = client.get(
        "/api/compare",
        params={"ref_session": "a", "ref_lap": 1, "cmp_session": "a", "cmp_lap": 1, "step": 0.1},
    )
    assert resp.status_code == 422


def test_compare_labels_differ_across_sessions(client):
    a = client.post("/api/sessions/demo").json()["id"]
    b = client.post("/api/sessions/demo").json()["id"]
    body = client.get(
        "/api/compare",
        params={"ref_session": a, "ref_lap": 2, "cmp_session": b, "cmp_lap": 3, "step": 5},
    ).json()
    assert body["ref"]["label"].endswith("lap 2")
    same = client.get(
        "/api/compare",
        params={"ref_session": a, "ref_lap": 2, "cmp_session": a, "cmp_lap": 3},
    ).json()
    assert same["cmp"]["label"] == "Lap 3"


def test_trace_out_minimal_channels():
    n = 4
    trace = LapTrace(
        pct=np.linspace(0, 1, n),
        time=np.arange(n, dtype=float),
        channels={"Speed": np.full(n, 10.0)},
    )
    out = main._trace_out(trace)
    assert out.speed == [36.0] * n
    assert out.throttle is None and out.gear is None and out.tyre_temp is None


def test_trace_out_full_channels():
    n = 3
    ones = np.ones(n)
    channels = {"Speed": ones, "Throttle": ones, "Gear": ones * 3, "RPM": ones * 5000.4}
    for pos, v in zip(("inner", "middle", "outer"), (10.0, 20.0, 30.0), strict=True):
        channels[f"LF_{pos}"] = ones * v
    out = main._trace_out(LapTrace(pct=np.linspace(0, 1, n), time=ones, channels=channels))
    assert out.throttle == [100.0] * n and out.gear == [3] * n and out.rpm == [5000.0] * n
    assert out.tyre_temp == {"LF": [20.0] * n}


class TestFrontendDir:
    def test_checkout_layout(self, monkeypatch, tmp_path):
        monkeypatch.delattr(sys, "frozen", raising=False)
        got = main._frontend_dir()
        assert got is None or (got / "index.html").is_file()

    def test_frozen_bundle(self, monkeypatch, tmp_path):
        dist = tmp_path / "frontend_dist"
        dist.mkdir()
        (dist / "index.html").write_text("<html></html>")
        monkeypatch.setattr(sys, "frozen", True, raising=False)
        monkeypatch.setattr(sys, "_MEIPASS", str(tmp_path), raising=False)
        assert main._frontend_dir() == dist

    def test_missing_index_returns_none(self, monkeypatch, tmp_path):
        monkeypatch.setattr(sys, "frozen", True, raising=False)
        monkeypatch.setattr(sys, "_MEIPASS", str(tmp_path), raising=False)
        assert main._frontend_dir() is None


def test_mount_frontend_serves_static_files(monkeypatch, tmp_path):
    (tmp_path / "index.html").write_text("<h1>hi</h1>")
    monkeypatch.setattr(main, "_frontend_dir", lambda: tmp_path)
    app = FastAPI()
    assert main._mount_frontend(app) is True
    assert "hi" in TestClient(app).get("/").text


def test_mount_frontend_without_build(monkeypatch):
    monkeypatch.setattr(main, "_frontend_dir", lambda: None)
    app = FastAPI()
    assert main._mount_frontend(app) is False
    assert not any(r.path == "/" for r in app.routes)
