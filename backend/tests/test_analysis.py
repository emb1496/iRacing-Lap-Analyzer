import numpy as np
import pytest

from lap_analyzer.analysis import compare_traces, detect_corners
from lap_analyzer.session import Session
from lap_analyzer.synthetic import DriverProfile, generate_session


@pytest.fixture(scope="module")
def session(demo_ibt) -> Session:
    return Session(demo_ibt, "demo.ibt")


def test_only_complete_off_pit_laps_are_valid(session, demo):
    valid = [lap.number for lap in session.laps if lap.valid]
    assert valid == [1, 2, 3]  # partial out lap (0) and in lap (4) excluded
    assert not session.lap(0).complete
    assert not session.lap(4).complete


def test_lap_times_match_ground_truth_to_the_millisecond(session, demo):
    measured = [session.lap(n).time for n in (1, 2, 3)]
    np.testing.assert_allclose(measured, demo.lap_times, atol=1e-3)


def test_session_metadata_from_yaml(session, demo):
    assert session.track == "Synthetic Ring"
    assert session.car == "Generic GT3"
    assert session.track_length == pytest.approx(demo.track.length, abs=10)
    assert session.best_lap.number == 2


def _compare(session, ref, cmp_, points=2000):
    grid = np.linspace(0, 1, points + 1)
    return compare_traces(session.trace(ref, grid), session.trace(cmp_, grid), session.track_length)


def test_delta_ends_at_lap_time_difference(session):
    result = _compare(session, 2, 3)
    assert result.delta[0] == pytest.approx(0, abs=1e-9)
    assert result.delta[-1] == pytest.approx(session.lap(3).time - session.lap(2).time, abs=1e-6)


def test_corner_deltas_sum_to_lap_delta(session):
    result = _compare(session, 2, 3)
    assert sum(c.time_delta for c in result.corners) == pytest.approx(result.delta[-1], abs=1e-6)


def test_finds_every_corner_of_the_synthetic_track(session):
    grid = np.linspace(0, 1, 2001)
    trace = session.trace(2, grid)
    apexes = detect_corners(grid * session.track_length, trace.channels["Speed"] * 3.6)
    assert 7 <= len(apexes) <= 10


def _reason(corner, kind, default=None):
    found = [r.value for r in corner.insight.reasons if r.kind == kind]
    return found[0] if found else default


def test_insights_explain_where_and_why_time_was_lost(session):
    # Lap 3 brakes at 80% capability everywhere and over-slows the corner at ~61% of the lap.
    corners = _compare(session, 2, 3).corners
    worst = max(corners, key=lambda c: c.time_delta)
    assert 0.57 <= worst.apex / session.track_length <= 0.65
    assert worst.time_delta > 0
    assert _reason(worst, "apex_speed") < 0  # slower at the apex
    assert any(_reason(c, "brake_point", 0) > 0 for c in corners)  # braked earlier
    braked = [c for c in corners if c.ref_brake is not None and abs(c.time_delta) >= 0.02]
    assert braked and all(_reason(c, "brake_pressure") == pytest.approx(-20, abs=1) for c in braked)


def test_identical_laps_are_even():
    synthetic = generate_session((DriverProfile(), DriverProfile()))
    from lap_analyzer.ibt import IbtFile

    session = Session(IbtFile.from_bytes(synthetic.ibt), "same.ibt")
    result = _compare(session, 1, 2)
    assert np.abs(result.delta).max() < 0.01
    assert all(c.insight.even and not c.insight.reasons for c in result.corners)


def test_gear_ignores_neutral_during_shifts_and_never_blends_gears():
    from lap_analyzer.analysis.laps import _resample_gear

    pct = np.linspace(0, 1, 11)
    gear = np.array([0, 4, 4, 0, 5, 5, 0, 0, 3, 3, 3], dtype=np.int32)
    out = _resample_gear(pct, gear, np.linspace(0, 1, 101))
    assert set(np.unique(out)) == {3.0, 4.0, 5.0}  # no 0s, no interpolated 1s/2s
    assert out[0] == 4  # leading neutral takes the first real gear
    assert out[35] == 4 and out[50] == 5 and out[75] == 5  # held through the shift
