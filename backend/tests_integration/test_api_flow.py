"""End-to-end API behaviour against a real server process."""

from __future__ import annotations

import pytest

from lap_analyzer import __version__
from lap_analyzer.ibt import write_ibt
from tests.helpers import lap_channels

pytestmark = pytest.mark.integration


def _compare(client, sid: str, ref: int, cmp_: int, **params):
    return client.get(
        "/api/compare",
        params={"ref_session": sid, "ref_lap": ref, "cmp_session": sid, "cmp_lap": cmp_, **params},
    )


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok", "version": __version__}


def test_demo_to_comparison_workflow(client, demo):
    summary = client.post("/api/sessions/demo").json()
    assert summary["track"] == "Synthetic Ring"
    assert [lap["number"] for lap in summary["laps"]] == [1, 2, 3]

    # The session is now visible through the list endpoint.
    assert summary["id"] in [s["id"] for s in client.get("/api/sessions").json()]

    # Lap times reported over the wire match the simulator's ground truth.
    for lap in summary["laps"]:
        assert lap["time"] == pytest.approx(demo.lap_times[lap["number"] - 1], abs=1e-3)

    body = _compare(client, summary["id"], summary["best_lap"], 3).raise_for_status().json()
    n = len(body["distance"])
    assert n > 100
    assert len(body["delta"]) == len(body["ref_trace"]["speed"]) == n
    assert body["delta"][0] == pytest.approx(0, abs=1e-3)

    # Corner deltas add up to the overall lap delta.
    lap_delta = body["cmp"]["lap_time"] - body["ref"]["lap_time"]
    assert sum(c["time_delta"] for c in body["corners"]) == pytest.approx(lap_delta, abs=0.01)
    assert body["delta"][-1] == pytest.approx(lap_delta, abs=0.02)
    assert all(isinstance(c["insight"]["reasons"], list) for c in body["corners"])


def test_upload_round_trip_then_compare(client, demo):
    resp = client.post("/api/sessions", files={"file": ("my_session.ibt", demo.ibt)})
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["filename"] == "my_session.ibt"
    assert _compare(client, summary["id"], 1, 2).status_code == 200


def test_step_changes_resolution(client):
    sid = client.post("/api/sessions/demo").json()["id"]
    fine = len(_compare(client, sid, 1, 2, step=2).json()["distance"])
    coarse = len(_compare(client, sid, 1, 2, step=10).json()["distance"])
    assert fine > coarse


@pytest.mark.parametrize(
    ("name", "content", "status"),
    [
        ("notes.txt", b"hello", 400),
        ("broken.ibt", b"\0" * 64, 422),
        ("short.ibt", write_ibt(lap_channels(laps=1)), 422),
    ],
)
def test_bad_uploads_are_rejected(client, name, content, status):
    assert client.post("/api/sessions", files={"file": (name, content)}).status_code == status


def test_compare_errors(client):
    sid = client.post("/api/sessions/demo").json()["id"]
    assert _compare(client, sid, 1, 99).status_code == 404
    assert _compare(client, "nope", 1, 2).status_code == 404
    assert _compare(client, sid, 1, 2, step=0.1).status_code == 422


def test_cors_preflight_allows_vite_dev_origin(client):
    resp = client.options(
        "/api/compare",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_openapi_docs_served(client):
    paths = client.get("/openapi.json").json()["paths"]
    assert {"/api/health", "/api/sessions", "/api/sessions/demo", "/api/compare"} <= set(paths)
