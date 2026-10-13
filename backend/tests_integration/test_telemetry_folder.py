"""The telemetry-folder library, served by a real process pointed at a real directory."""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import httpx2
import pytest

from lap_analyzer import library
from lap_analyzer.synthetic import DEMO_PROFILES, generate_session
from tests_integration.conftest import launched_server

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def folder(tmp_path_factory) -> Path:
    path = tmp_path_factory.mktemp("telemetry")
    (path / "older_gt3.ibt").write_bytes(
        generate_session(DEMO_PROFILES, start_date=1_700_000_000).ibt
    )
    (path / "newer_mx5.ibt").write_bytes(
        generate_session(DEMO_PROFILES, car="Mazda MX-5", start_date=1_700_100_000).ibt
    )
    (path / "corrupt.ibt").write_bytes(b"not a telemetry file")
    (path / "notes.txt").write_text("ignored")
    (path / "directory.ibt").mkdir()
    return path


@pytest.fixture(scope="module")
def library_client(folder: Path) -> Iterator[httpx2.Client]:
    with launched_server(**{library.ENV_VAR: str(folder)}) as base:
        with httpx2.Client(base_url=base, timeout=30) as c:
            yield c


@pytest.fixture(scope="module")
def empty_client(tmp_path_factory) -> Iterator[httpx2.Client]:
    missing = tmp_path_factory.mktemp("parent") / "no-such-folder"
    with launched_server(**{library.ENV_VAR: str(missing)}) as base:
        with httpx2.Client(base_url=base, timeout=30) as c:
            yield c


def test_lists_readable_recordings_newest_first(library_client, folder):
    body = library_client.get("/api/files").raise_for_status().json()
    assert body["directory"] == str(folder)
    assert [f["name"] for f in body["files"]] == ["newer_mx5.ibt", "older_gt3.ibt"]
    newest = body["files"][0]
    assert newest["car"] == "Mazda MX-5"
    assert newest["track"] == "Synthetic Ring"


def test_loads_a_recording_and_compares_it(library_client):
    resp = library_client.post("/api/sessions/from-library", json={"name": "older_gt3.ibt"})
    assert resp.status_code == 200
    summary = resp.json()
    assert summary["filename"] == "older_gt3.ibt"
    compare = library_client.get(
        "/api/compare",
        params={
            "ref_session": summary["id"],
            "ref_lap": 1,
            "cmp_session": summary["id"],
            "cmp_lap": 2,
        },
    )
    assert compare.status_code == 200


@pytest.mark.parametrize("name", ["", "../older_gt3.ibt", "sub/older_gt3.ibt", "notes.txt"])
def test_rejects_names_outside_the_folder(library_client, name):
    resp = library_client.post("/api/sessions/from-library", json={"name": name})
    assert resp.status_code == 400


def test_missing_recording_is_not_found(library_client):
    resp = library_client.post("/api/sessions/from-library", json={"name": "ghost.ibt"})
    assert resp.status_code == 404


def test_unreadable_recording_is_rejected(library_client):
    resp = library_client.post("/api/sessions/from-library", json={"name": "corrupt.ibt"})
    assert resp.status_code == 422


def test_without_a_telemetry_folder(empty_client):
    assert empty_client.get("/api/files").json() == {"directory": None, "files": []}
    resp = empty_client.post("/api/sessions/from-library", json={"name": "older_gt3.ibt"})
    assert resp.status_code == 404
