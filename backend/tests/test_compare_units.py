import numpy as np
import pytest

from lap_analyzer.analysis import LapTrace, compare_traces, detect_corners
from lap_analyzer.analysis.compare import (
    Corner,
    Insight,
    _brake_start,
    _explain,
    _full_throttle,
    _smooth,
)

LENGTH = 1000.0
PCT = np.linspace(0, 1, 501)  # 2 m grid
DIST = PCT * LENGTH


def _speed(shift: float = 0.0, depth: float = 40.0) -> np.ndarray:
    """m/s profile with two corners at 300 m and 700 m."""
    kmh = 100 - depth * np.exp(-(((DIST - 300 - shift) / 40) ** 2))
    kmh -= depth * np.exp(-(((DIST - 700 - shift) / 40) ** 2))
    return kmh / 3.6


def _trace(pace: float = 1.0, with_pedals: bool = True, **speed_kw) -> LapTrace:
    speed = _speed(**speed_kw)
    channels = {"Speed": speed}
    if with_pedals:
        channels["Brake"] = np.where(speed * 3.6 < 90, 0.8, 0.0)
        channels["Throttle"] = np.where(speed * 3.6 > 98, 1.0, 0.3)
    return LapTrace(pct=PCT, time=PCT * 20 * pace, channels=channels)


def _corner(**kw) -> Corner:
    base = dict(
        number=1, start=0.0, apex=100.0, end=200.0, time_delta=0.2,
        ref_min_speed=60.0, cmp_min_speed=60.0, ref_brake=50.0, cmp_brake=50.0,
        ref_peak_brake=80.0, cmp_peak_brake=80.0, ref_full_throttle=150.0,
        cmp_full_throttle=150.0, insight=Insight(even=True, reasons=[]),
    )  # fmt: skip
    return Corner(**{**base, **kw})


def _kinds(corner: Corner) -> dict[str, float | None]:
    insight = _explain(corner)
    assert not insight.even
    return {r.kind: r.value for r in insight.reasons}


def test_smooth_window_of_one_is_identity():
    a = np.arange(5.0)
    assert _smooth(a, 1) is a


def test_smooth_preserves_length_and_constants():
    out = _smooth(np.full(20, 3.0), 4)
    assert len(out) == 20
    np.testing.assert_allclose(out, 3.0)


def test_detect_corners_finds_both_dips():
    apexes = detect_corners(DIST, _speed() * 3.6)
    assert [round(DIST[i]) for i in apexes] == [300, 700]


def test_detect_corners_ignores_shallow_dips():
    assert detect_corners(DIST, _speed(depth=4) * 3.6) == []


def test_detect_corners_collapses_plateau():
    speed = np.full(501, 100.0)
    speed[240:260] = 50.0  # flat-bottomed dip
    assert len(detect_corners(DIST, speed)) == 1


def test_brake_start_none_without_braking():
    assert _brake_start(np.zeros(50), 0, 40, 3) is None


def test_brake_start_bridges_short_releases_only():
    brake = np.zeros(60)
    brake[10:15] = 1
    brake[17:30] = 1  # gap of 3 samples: bridged
    assert _brake_start(brake, 0, 40, 5) == 10
    assert _brake_start(brake, 0, 40, 2) == 17  # gap too long: last zone only


def test_full_throttle():
    throttle = np.zeros(30)
    throttle[20:] = 1
    assert _full_throttle(throttle, 5, 29) == 20
    assert _full_throttle(np.zeros(30), 5, 29) is None


def test_explain_even_when_delta_rounds_to_nothing():
    c = _corner(time_delta=0.004, cmp_min_speed=40.0)
    assert _explain(c) == Insight(even=True, reasons=[])


def test_explain_no_differences_gives_no_reasons():
    assert _kinds(_corner()) == {}


def test_explain_all_reasons():
    got = _kinds(
        _corner(cmp_brake=40.0, cmp_peak_brake=60.0, cmp_min_speed=55.0, cmp_full_throttle=170.0)
    )
    assert got == {
        "brake_point": 10.0,
        "brake_pressure": -20.0,
        "apex_speed": -5.0,
        "throttle_point": 20.0,
    }


def test_explain_brake_new_when_only_cmp_brakes():
    got = _kinds(_corner(ref_brake=None, ref_peak_brake=0.0))
    assert got == {"brake_new": None}


def test_explain_small_differences_ignored():
    assert _kinds(_corner(cmp_brake=47.0, cmp_peak_brake=75.0, cmp_min_speed=59.0)) == {}


def test_explain_skips_missing_throttle_and_brake():
    got = _kinds(_corner(ref_brake=None, cmp_brake=None, ref_full_throttle=None))
    assert got == {}


def test_compare_requires_same_grid():
    a, b = _trace(), _trace()
    b = LapTrace(pct=PCT[::-1].copy(), time=b.time, channels=b.channels)
    with pytest.raises(ValueError, match="same grid"):
        compare_traces(a, b, LENGTH)


def test_compare_identical_laps():
    result = compare_traces(_trace(), _trace(), LENGTH)
    assert len(result.corners) == 2
    assert not result.delta.any()
    assert all(c.insight.even for c in result.corners)
    assert sum(c.time_delta for c in result.corners) == pytest.approx(0)


def test_compare_corner_deltas_tile_the_lap():
    result = compare_traces(_trace(), _trace(pace=1.05, shift=-20, depth=50), LENGTH)
    assert sum(c.time_delta for c in result.corners) == pytest.approx(result.delta[-1])
    first = result.corners[0]
    assert first.cmp_min_speed < first.ref_min_speed
    assert any(r.kind == "apex_speed" for r in first.insight.reasons)
    assert first.ref_brake is not None and first.ref_full_throttle is not None


def test_compare_without_pedal_channels():
    result = compare_traces(_trace(with_pedals=False), _trace(with_pedals=False, depth=50), LENGTH)
    for c in result.corners:
        assert c.ref_brake is None and c.cmp_brake is None
        assert c.ref_peak_brake == 0 and c.ref_full_throttle is None


def test_compare_with_brake_channel_but_no_braking():
    def coasting() -> LapTrace:
        t = _trace()
        return LapTrace(
            pct=t.pct, time=t.time, channels={**t.channels, "Brake": np.zeros_like(t.time)}
        )

    result = compare_traces(coasting(), coasting(), LENGTH)
    assert all(c.ref_brake is None and c.ref_peak_brake == 0 for c in result.corners)
