import numpy as np
import pytest
from helpers import lap_channels, make_ibt

from lap_analyzer.analysis import LapTrace, lap_conditions, resample_lap, split_laps
from lap_analyzer.analysis.conditions import tyre_channel_names, tyre_summaries
from lap_analyzer.ibt import IbtFile, write_ibt
from lap_analyzer.session import Session


@pytest.fixture(scope="module")
def session(demo_ibt) -> Session:
    return Session(demo_ibt, "demo.ibt")


def _conditions(session, lap):
    grid = np.linspace(0, 1, 501)
    return lap_conditions(session.ibt, session.lap(lap), session.trace(lap, grid))


def test_weather_is_summarised_per_lap(session):
    lap2, lap3 = _conditions(session, 2), _conditions(session, 3)
    assert lap2.track_temp == pytest.approx(29.0, abs=0.5)
    assert lap3.track_temp < lap2.track_temp
    assert (lap2.wetness, lap3.wetness) == (1, 3)
    assert lap3.humidity == pytest.approx(64, abs=1)  # 0..1 fraction -> %
    assert lap3.wind_speed == pytest.approx(3.6 * 4.4, abs=1)  # m/s -> km/h


def test_tyre_summary_orients_bands_from_the_car(session):
    tyres = _conditions(session, 2).tyres
    assert set(tyres) == {"LF", "RF", "LR", "RR"}
    # Camber makes the inside edge hottest on every tyre, so the left/right swap must hold.
    assert all(t.inner > t.middle for t in tyres.values())
    assert tyres["RF"].pressure > 150  # hot pressure above the cold set pressure


def test_tyre_channel_names_prefers_live_surface_and_swaps_sides():
    class Fake(dict):
        pass

    ibt = Fake.fromkeys(
        [f"{c}{p}{b}" for c in ("LF", "RF") for p in ("tempC", "temp") for b in "LMR"]
    )
    names = tyre_channel_names(ibt)
    assert names["LF_inner"] == "LFtempR" and names["LF_outer"] == "LFtempL"
    assert names["RF_inner"] == "RFtempL" and names["RF_outer"] == "RFtempR"
    assert "LR_inner" not in names


def test_tyre_channel_names_falls_back_to_carcass():
    ibt = dict.fromkeys(f"LFtempC{b}" for b in "LMR")
    assert tyre_channel_names(ibt)["LF_middle"] == "LFtempCM"


# --- hand-built files: missing / partial channels --------------------------------------------
GRID = np.linspace(0, 1, 11)


def _lap_conditions(ibt):
    lap = split_laps(ibt)[1]
    return lap_conditions(ibt, lap, resample_lap(ibt, lap, GRID))


def test_conditions_with_no_weather_or_tyre_channels():
    c = _lap_conditions(make_ibt())
    assert (c.track_temp, c.air_temp, c.wetness, c.wind_speed, c.humidity) == (None,) * 5
    assert c.tyres == {}


def test_conditions_fallback_channel_and_unknown_wetness():
    ch = lap_channels(
        TrackTemp=np.full(400, 30.0, np.float32),
        TrackWetness=np.zeros(400, np.int32),
        RelativeHumidity=np.full(400, 0.5, np.float32),
    )
    c = _lap_conditions(IbtFile.from_bytes(write_ibt(ch)))
    assert c.track_temp == pytest.approx(30.0)
    assert c.wetness is None  # 0 means unknown
    assert c.humidity == pytest.approx(50.0)


def test_tyre_summaries_skip_incomplete_corners_and_allow_missing_pressure():
    ones = np.ones(5)
    trace = LapTrace(
        pct=np.linspace(0, 1, 5),
        time=ones,
        channels={
            "LF_inner": ones, "LF_middle": ones * 2, "LF_outer": ones * 3,  # no pressure
            "RF_inner": ones,  # incomplete: skipped
        },
    )  # fmt: skip
    out = tyre_summaries(trace)
    assert set(out) == {"LF"}
    assert out["LF"].pressure is None and out["LF"].middle == 2.0


def test_tyre_channel_names_prefers_surface_then_carcass_and_adds_pressure():
    z = np.zeros(400, np.float32)
    ch = lap_channels(LFtempCL=z, LFtempCM=z, LFtempCR=z, LFpressure=z, RFtempL=z, RFtempM=z)
    names = tyre_channel_names(IbtFile.from_bytes(write_ibt(ch)))
    assert names["LF_inner"] == "LFtempCR" and names["LF_outer"] == "LFtempCL"
    assert names["LF_pressure"] == "LFpressure"
    assert not any(k.startswith("RF") for k in names)  # RFtempR missing
