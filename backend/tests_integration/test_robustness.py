"""Hostile and unusual uploads, sent to the running server over HTTP."""

from __future__ import annotations

import numpy as np
import pytest

from lap_analyzer.ibt import IbtFile, write_ibt
from lap_analyzer.synthetic import DriverProfile, generate_session
from tests_integration.builders import (
    patch_disk_header,
    patch_header,
    patch_var_header,
    rebuild,
)

pytestmark = pytest.mark.integration


def _upload(client, data: bytes, name: str = "session.ibt"):
    return client.post("/api/sessions", files={"file": (name, data)})


def _compare(client, ref_sid, ref_lap, cmp_sid, cmp_lap):
    return client.get(
        "/api/compare",
        params={
            "ref_session": ref_sid,
            "ref_lap": ref_lap,
            "cmp_session": cmp_sid,
            "cmp_lap": cmp_lap,
        },
    )


@pytest.fixture(scope="module")
def good(demo) -> bytes:
    return demo.ibt


# ---- corrupt files are rejected with a message, never a 500 ----------------------------------


@pytest.mark.parametrize(
    ("corrupt", "message"),
    [
        (lambda d: patch_header(d, num_vars=0), "declares no channels"),
        (lambda d: patch_header(d, var_header_offset=len(d)), "run past end of file"),
        (lambda d: patch_var_header(d, 0, type=99), "unknown variable type 99"),
        (lambda d: d[:10], "an .ibt header alone is"),
    ],
    ids=["no-channels", "headers-past-eof", "bad-var-type", "truncated"],
)
def test_corrupt_headers_are_422(client, good, corrupt, message):
    resp = _upload(client, corrupt(good))
    assert resp.status_code == 422
    assert message in resp.json()["detail"]


def test_missing_required_channel_is_422(client, good):
    resp = _upload(client, rebuild(good, drop=("LapDistPct",)))
    assert resp.status_code == 422
    assert "missing required channels: LapDistPct" in resp.json()["detail"]


def test_file_with_no_samples_is_422(client, good):
    # Same channels, zero rows, and no YAML to say how long the track is.
    ibt = IbtFile.from_bytes(good)
    channels = {n: (ibt[n][:0], c.unit, c.description) for n, c in ibt.channels.items()}
    resp = _upload(client, write_ibt(channels))
    assert resp.status_code == 422
    assert "cannot determine track length" in resp.json()["detail"]


def test_stale_record_count_is_ignored(client, good):
    """Crashed sessions leave a wrong record count in the header; the file size wins."""
    reference = _upload(client, good).json()
    for count in (0, 10**9):
        resp = _upload(client, patch_disk_header(good, record_count=count))
        assert resp.status_code == 200
        assert [lap["number"] for lap in resp.json()["laps"]] == [
            lap["number"] for lap in reference["laps"]
        ]


def test_duplicate_channel_name_keeps_the_first(client, good):
    resp = _upload(client, patch_var_header(good, -1, name=b"Speed"))
    assert resp.status_code == 200


# ---- sessions whose YAML is missing or broken ------------------------------------------------


@pytest.mark.parametrize("yaml", ["", "WeekendInfo: [unclosed"], ids=["empty", "invalid"])
def test_track_length_is_estimated_without_usable_yaml(client, good, demo, yaml):
    summary = _upload(client, rebuild(good, session_info=yaml)).json()
    assert summary["track"] == "Unknown track"
    assert summary["car"] == "Unknown car"
    assert summary["driver"] == "Unknown driver"
    # Integrating speed over a lap recovers the length to within a metre or so.
    assert summary["track_length"] == pytest.approx(demo.track.length, rel=0.01)
    assert _compare(client, summary["id"], 1, summary["id"], 2).status_code == 200


def test_track_length_in_miles(client, good):
    yaml = "WeekendInfo:\n TrackDisplayName: Imperial Ring\n TrackLength: 2.00 mi\n"
    summary = _upload(client, rebuild(good, session_info=yaml)).json()
    assert summary["track_length"] == pytest.approx(2 * 1609.344, abs=0.5)


# ---- comparison errors -----------------------------------------------------------------------


def test_laps_from_different_tracks_are_rejected(client, good):
    a = _upload(client, good).json()
    other = good.replace(b"Synthetic Ring", b"Elsewhere Ring")
    b = _upload(client, other).json()
    resp = _compare(client, a["id"], 1, b["id"], 2)
    assert resp.status_code == 400
    assert "different tracks" in resp.json()["detail"]


def test_incomplete_laps_cannot_be_compared(client):
    sid = client.post("/api/sessions/demo").json()["id"]
    resp = _compare(client, sid, 0, sid, 2)  # lap 0 is the partial out lap
    assert resp.status_code == 400
    assert "incomplete" in resp.json()["detail"]


def test_oldest_sessions_are_evicted(client, good):
    first = _upload(client, good).json()["id"]
    for _ in range(25):
        _upload(client, good)
    ids = [s["id"] for s in client.get("/api/sessions").json()]
    assert len(ids) == 20
    assert first not in ids
    assert _compare(client, first, 1, first, 2).status_code == 404


# ---- optional channels -----------------------------------------------------------------------


def _body(client, data: bytes, ref=1, cmp_=2):
    sid = _upload(client, data).json()["id"]
    resp = _compare(client, sid, ref, sid, cmp_)
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_comparison_without_pedals_gear_or_steering(client, good):
    body = _body(client, rebuild(good, drop=("Throttle", "Brake", "Gear", "SteeringWheelAngle")))
    for key in ("throttle", "brake", "gear", "steering"):
        assert body["ref_trace"][key] is None
    assert all(c["ref_brake"] is None for c in body["corners"])


def test_gear_channel_stuck_in_neutral(client, good):
    gear = np.zeros_like(IbtFile.from_bytes(good)["Gear"])
    body = _body(client, rebuild(good, replace={"Gear": gear}))
    assert set(body["ref_trace"]["gear"]) == {0}


def test_conditions_with_no_weather_channels(client, good):
    weather = ("TrackTempCrew", "AirTemp", "TrackWetness", "WindVel", "RelativeHumidity")
    body = _body(client, rebuild(good, drop=weather))
    cond = body["ref_conditions"]
    assert cond["track_temp"] is None and cond["air_temp"] is None
    assert cond["wetness"] is None and cond["wind_speed"] is None and cond["humidity"] is None


def test_carcass_temps_and_pressures_when_surface_temps_are_missing(client, good):
    ibt = IbtFile.from_bytes(good)
    surface = [n for n in ibt.channels if n[2:6] == "temp" and n[6] in "LMR" and len(n) == 7]
    assert surface, "demo session should log surface tyre temperatures"
    add = {}
    for name in surface:
        add[name[:6] + "C" + name[6:]] = (ibt[name], "C", "carcass")  # LFtempCL
    for corner in ("LF", "RF", "LR", "RR"):
        add[f"{corner}pressure"] = (np.full(len(ibt), 170.0, np.float32), "kPa", "pressure")
    body = _body(client, rebuild(good, drop=tuple(surface), add=add))
    tyres = body["ref_conditions"]["tyres"]
    assert set(tyres) == {"LF", "RF", "LR", "RR"}
    assert tyres["LF"]["pressure"] == pytest.approx(170.0)


# ---- driver behaviour the insights should describe -------------------------------------------


def test_identical_laps_are_even(client):
    same = DriverProfile()
    data = generate_session((same, same, same)).ibt
    body = _body(client, data, 1, 2)
    assert all(c["insight"]["even"] for c in body["corners"])


@pytest.mark.parametrize(
    ("slow", "reason"),
    [
        (DriverProfile(braking=0.5), "brake_pressure"),
        (DriverProfile(grip=0.9), "apex_speed"),
    ],
    ids=["gentle-braking", "low-grip"],
)
def test_driver_mistakes_are_explained(client, slow, reason):
    data = generate_session((DriverProfile(), slow)).ibt
    body = _body(client, data, 1, 2)
    reasons = {r["kind"] for c in body["corners"] for r in c["insight"]["reasons"]}
    assert reason in reasons


# ---- pedal and speed traces that exercise the insight rules ----------------------------------


def _lap_edit(data: bytes, channel: str, lap: int, edit) -> bytes:
    """Rewrite ``channel`` for the samples of one lap only."""
    ibt = IbtFile.from_bytes(data)
    values = ibt[channel].copy()
    mask = ibt["Lap"] == lap
    values[mask] = edit(values[mask])
    return rebuild(data, replace={channel: values})


def _reasons(body) -> set[str]:
    return {r["kind"] for c in body["corners"] for r in c["insight"]["reasons"]}


def test_a_lap_without_braking_is_compared_with_one_that_brakes(client, good):
    """Lap 1 never touches the brake, lap 2 does: every corner reports a new braking zone."""
    no_brake = _lap_edit(good, "Brake", 1, np.zeros_like)
    body = _body(client, no_brake, 1, 2)
    assert all(c["ref_brake"] is None for c in body["corners"])
    assert all(c["ref_peak_brake"] == 0 for c in body["corners"])
    assert "brake_new" in _reasons(body)


def test_late_throttle_is_reported(client, good):
    late = _lap_edit(good, "Throttle", 2, lambda t: np.roll(t, 150))
    assert "throttle_point" in _reasons(_body(client, late, 1, 2))


def test_flat_bottomed_speed_trace_still_finds_each_corner_once(client, good, demo):
    """A speed trace clipped at a floor has a plateau at every apex, not a single minimum."""
    clipped = _lap_edit(good, "Speed", 1, lambda v: np.maximum(v, np.percentile(v, 20)))
    body = _body(client, clipped, 1, 2)
    reference = _body(client, good, 1, 2)
    assert 0 < len(body["corners"]) <= len(reference["corners"]) + 1


def test_coarsest_resolution_comparison(client, good):
    sid = _upload(client, good).json()["id"]
    resp = client.get(
        "/api/compare",
        params={
            "ref_session": sid,
            "ref_lap": 1,
            "cmp_session": sid,
            "cmp_lap": 2,
            "step": 20,
        },
    )
    assert resp.status_code == 200
    assert len(resp.json()["corners"]) > 0


def test_tyre_summaries_without_pressure_channels(client, good):
    pressures = tuple(f"{c}pressure" for c in ("LF", "RF", "LR", "RR"))
    body = _body(client, rebuild(good, drop=pressures))
    assert all(t["pressure"] is None for t in body["ref_conditions"]["tyres"].values())


def test_a_tyre_missing_from_the_log_is_left_out(client, good):
    body = _body(client, rebuild(good, drop=("LFtempL", "LFtempM", "LFtempR")))
    assert "LF" not in body["ref_conditions"]["tyres"]
    assert set(body["ref_conditions"]["tyres"]) == {"RF", "LR", "RR"}
    assert set(body["ref_trace"]["tyre_temp"]) == {"RF", "LR", "RR"}


def test_a_lap_with_no_corners_can_be_compared(client, good):
    """A flat-out lap (an oval, say) has no braking zones to call corners."""
    flat = rebuild(
        good, replace={"Speed": np.full(len(IbtFile.from_bytes(good)), 60.0, np.float32)}
    )
    body = _body(client, flat)
    assert body["corners"] == []
    assert len(body["delta"]) == len(body["distance"])
