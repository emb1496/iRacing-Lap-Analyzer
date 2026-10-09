"""The built frontend is served by the same process as the API."""

from __future__ import annotations

import pytest

from lap_analyzer.main import _frontend_dir

pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(_frontend_dir() is None, reason="frontend not built (npm run build)"),
]


def test_index_served_at_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert '<div id="root">' in resp.text


def test_api_not_shadowed_by_static_mount(client):
    assert client.get("/api/health").json()["status"] == "ok"
