import os
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from lap_analyzer import library, main
from lap_analyzer.synthetic import DEMO_PROFILES, generate_session

DAY = 86400


@pytest.fixture
def folder(tmp_path, monkeypatch):
    """A telemetry folder with two cars/tracks and one broken file."""
    monkeypatch.setenv(library.ENV_VAR, str(tmp_path))
    files = {
        "old_gt3.ibt": dict(start_date=1_767_000_000, event_type="Practice"),
        "new_m4.ibt": dict(start_date=1_767_000_000 + 5 * DAY, car="BMW M4 GT3", event_type="Race"),
        "other_track.ibt": dict(start_date=1_767_000_000 + 2 * DAY, track_name="Other Ring"),
    }
    for name, kwargs in files.items():
        (tmp_path / name).write_bytes(generate_session(DEMO_PROFILES, **kwargs).ibt)
    (tmp_path / "broken.ibt").write_bytes(b"\0" * 64)
    (tmp_path / "notes.txt").write_text("hi")
    return tmp_path


@pytest.fixture
def client():
    return TestClient(main.app)


def test_scan_describes_files_newest_first(folder):
    entries = library.scan(folder)
    assert [e.name for e in entries] == ["new_m4.ibt", "other_track.ibt", "old_gt3.ibt"]
    newest = entries[0]
    assert (newest.car, newest.track, newest.session_type) == (
        "BMW M4 GT3",
        "Synthetic Ring",
        "Race",
    )
    assert newest.recorded_at.tzinfo is not None
    assert newest.driver == "Demo Driver"


def test_scan_skips_unreadable_and_non_ibt_and_dirs(folder):
    (folder / "dir.ibt").mkdir()
    names = {e.name for e in library.scan(folder)}
    assert names == {"old_gt3.ibt", "new_m4.ibt", "other_track.ibt"}


def test_scan_missing_directory_is_empty(tmp_path):
    assert library.scan(tmp_path / "nope") == []


def test_scan_falls_back_to_mtime_without_a_header_date(tmp_path):
    path = tmp_path / "nodate.ibt"
    path.write_bytes(generate_session(DEMO_PROFILES, start_date=0).ibt)
    os.utime(path, (1_700_000_000, 1_700_000_000))
    [entry] = library.scan(tmp_path)
    assert entry.recorded_at == datetime.fromtimestamp(1_700_000_000, tz=timezone.utc)


def test_scan_reuses_cached_entry_for_unchanged_file(tmp_path, monkeypatch):
    (tmp_path / "a.ibt").write_bytes(generate_session(DEMO_PROFILES).ibt)
    first = library.scan(tmp_path)
    monkeypatch.setattr(library, "read_meta", lambda path: pytest.fail("re-read an unchanged file"))
    assert library.scan(tmp_path) == first


def test_scan_skips_file_that_vanishes_before_stat(tmp_path, monkeypatch):
    (tmp_path / "gone.ibt").write_bytes(b"")
    real_stat = library.Path.stat

    def flaky_stat(self, *args, **kwargs):
        if self.name == "gone.ibt":
            raise FileNotFoundError(self.name)
        return real_stat(self, *args, **kwargs)

    monkeypatch.setattr(library.Path, "stat", flaky_stat)
    assert library.scan(tmp_path) == []


def test_scan_cache_follows_file_changes(tmp_path):
    path = tmp_path / "a.ibt"
    path.write_bytes(generate_session(DEMO_PROFILES).ibt)
    assert library.scan(tmp_path)[0].car == "Generic GT3"
    path.write_bytes(generate_session(DEMO_PROFILES, car="Mazda MX-5").ibt)
    assert library.scan(tmp_path)[0].car == "Mazda MX-5"


@pytest.mark.parametrize("name", ["", "../x.ibt", "sub/x.ibt", "x.txt", "/etc/passwd"])
def test_resolve_rejects_names_outside_the_folder(folder, name):
    with pytest.raises(ValueError):
        library.resolve(folder, name)


def test_resolve_missing_file(folder):
    with pytest.raises(FileNotFoundError):
        library.resolve(folder, "gone.ibt")


def test_resolve_ok(folder):
    assert library.resolve(folder, "old_gt3.ibt") == folder / "old_gt3.ibt"


def test_telemetry_dir_prefers_env(tmp_path, monkeypatch):
    monkeypatch.setenv(library.ENV_VAR, str(tmp_path))
    assert library.telemetry_dir() == tmp_path
    monkeypatch.setenv(library.ENV_VAR, str(tmp_path / "missing"))
    assert library.telemetry_dir() is None


def test_telemetry_dir_finds_standard_location(tmp_path, monkeypatch):
    monkeypatch.delenv(library.ENV_VAR, raising=False)
    monkeypatch.setattr(library, "Path", library.Path)  # keep Path real
    monkeypatch.setattr(library.Path, "home", classmethod(lambda cls: tmp_path))
    monkeypatch.setattr(library, "_windows_documents", lambda: None)  # not the real Documents
    assert library.telemetry_dir() is None
    target = tmp_path / "OneDrive" / "Documents" / "iRacing" / "telemetry"
    target.mkdir(parents=True)
    assert library.telemetry_dir() == target


def test_api_files(folder, client):
    body = client.get("/api/files").json()
    assert body["directory"] == str(folder)
    assert [f["name"] for f in body["files"]] == ["new_m4.ibt", "other_track.ibt", "old_gt3.ibt"]
    first = body["files"][0]
    assert first["car"] == "BMW M4 GT3"
    assert first["recorded_at"].endswith(("Z", "+00:00"))


def test_api_files_without_folder(tmp_path, monkeypatch, client):
    monkeypatch.setenv(library.ENV_VAR, str(tmp_path / "missing"))
    assert client.get("/api/files").json() == {"directory": None, "files": []}


def test_api_load_from_library(folder, client):
    resp = client.post("/api/sessions/from-library", json={"name": "new_m4.ibt"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["filename"] == "new_m4.ibt"
    assert body["car"] == "BMW M4 GT3"
    assert body["session_type"] == "Race"
    assert body["recorded_at"].startswith("2026-01-03")


def test_api_load_from_library_uses_mtime_without_header_date(tmp_path, monkeypatch, client):
    monkeypatch.setenv(library.ENV_VAR, str(tmp_path))
    path = tmp_path / "nodate.ibt"
    path.write_bytes(generate_session(DEMO_PROFILES, start_date=0).ibt)
    os.utime(path, (1_700_000_000, 1_700_000_000))
    body = client.post("/api/sessions/from-library", json={"name": "nodate.ibt"}).json()
    assert body["recorded_at"].startswith("2023-11-14")


@pytest.mark.parametrize("name", ["../x.ibt", "notes.txt", ""])
def test_api_load_from_library_rejects_bad_names(folder, client, name):
    assert client.post("/api/sessions/from-library", json={"name": name}).status_code == 400


def test_api_load_from_library_missing(folder, client):
    assert client.post("/api/sessions/from-library", json={"name": "gone.ibt"}).status_code == 404


def test_api_load_from_library_without_folder(tmp_path, monkeypatch, client):
    monkeypatch.setenv(library.ENV_VAR, str(tmp_path / "missing"))
    assert client.post("/api/sessions/from-library", json={"name": "a.ibt"}).status_code == 404


def test_api_load_from_library_corrupt_file(folder, client):
    assert client.post("/api/sessions/from-library", json={"name": "broken.ibt"}).status_code == 422


def test_compare_blocks_different_cars_and_tracks(folder, client):
    load = lambda n: client.post("/api/sessions/from-library", json={"name": n}).json()  # noqa: E731
    gt3, m4, other = load("old_gt3.ibt"), load("new_m4.ibt"), load("other_track.ibt")

    def cmp(a, b):
        params = {"ref_session": a["id"], "ref_lap": 2, "cmp_session": b["id"], "cmp_lap": 2}
        return client.get("/api/compare", params=params)

    assert cmp(gt3, gt3).status_code == 200
    resp = cmp(gt3, m4)
    assert resp.status_code == 400 and "different cars" in resp.json()["detail"]
    resp = cmp(gt3, other)
    assert resp.status_code == 400 and "different tracks" in resp.json()["detail"]
