import pytest
from fastapi.testclient import TestClient

from lap_analyzer.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="module")
def demo_summary(client):
    resp = client.post("/api/sessions/demo")
    assert resp.status_code == 200
    return resp.json()


def test_demo_session_summary(demo_summary):
    assert demo_summary["track"] == "Synthetic Ring"
    assert [lap["number"] for lap in demo_summary["laps"]] == [1, 2, 3]
    assert demo_summary["best_lap"] == 2


def test_upload_round_trip(client, demo):
    resp = client.post("/api/sessions", files={"file": ("my_session.ibt", demo.ibt)})
    assert resp.status_code == 200
    assert resp.json()["filename"] == "my_session.ibt"


def test_upload_rejects_non_ibt(client):
    resp = client.post("/api/sessions", files={"file": ("notes.txt", b"hello")})
    assert resp.status_code == 400


def test_upload_rejects_corrupt_ibt(client):
    resp = client.post("/api/sessions", files={"file": ("broken.ibt", b"\0" * 64)})
    assert resp.status_code == 422


def test_compare(client, demo_summary):
    sid = demo_summary["id"]
    resp = client.get(
        "/api/compare",
        params={"ref_session": sid, "ref_lap": 2, "cmp_session": sid, "cmp_lap": 3},
    )
    assert resp.status_code == 200
    body = resp.json()
    n = len(body["distance"])
    assert len(body["delta"]) == n
    assert len(body["ref_trace"]["speed"]) == n
    assert body["corners"] and isinstance(body["corners"][0]["insight"]["reasons"], list)


def test_compare_unknown_lap(client, demo_summary):
    sid = demo_summary["id"]
    resp = client.get(
        "/api/compare",
        params={"ref_session": sid, "ref_lap": 2, "cmp_session": sid, "cmp_lap": 99},
    )
    assert resp.status_code == 404
