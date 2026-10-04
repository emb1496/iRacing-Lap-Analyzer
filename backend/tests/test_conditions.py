import numpy as np
import pytest

from lap_analyzer.analysis import lap_conditions
from lap_analyzer.analysis.conditions import tyre_channel_names
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
