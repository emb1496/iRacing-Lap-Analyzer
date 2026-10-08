import numpy as np
import pytest

from lap_analyzer.ibt import IbtFile, write_ibt
from lap_analyzer.session import Session, SessionStore, _parse_track_length
from tests.helpers import lap_channels, make_ibt


def test_session_metadata_from_yaml(session, demo):
    assert session.track == "Synthetic Ring"
    assert session.car == "Generic GT3"
    assert session.track_length == pytest.approx(demo.track.length, abs=10)
    assert session.best_lap.number == 2


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("5.00 km", 5000.0),
        ("1.5 mi", 1.5 * 1609.344),
        ("", None),
        ("long", None),
    ],
)
def test_parse_track_length(raw, expected):
    got = _parse_track_length({"WeekendInfo": {"TrackLength": raw}})
    assert got == pytest.approx(expected) if expected else got is None


def test_parse_track_length_without_weekend_info():
    assert _parse_track_length({}) is None


YAML = """\
WeekendInfo:
  TrackDisplayName: Test Circuit
  TrackLength: 2.00 km
DriverInfo:
  DriverCarIdx: 7
  Drivers:
    - CarIdx: 3
      UserName: Other
    - CarIdx: 7
      UserName: Me
      CarScreenName: Fast Car
"""


def test_session_reads_metadata():
    s = Session(make_ibt(YAML), "a.ibt")
    assert (s.track, s.car, s.driver) == ("Test Circuit", "Fast Car", "Me")
    assert s.track_length == 2000.0
    assert len(s.id) == 12


def test_session_defaults_and_track_length_estimate():
    s = Session(make_ibt(), "a.ibt")
    assert (s.track, s.car, s.driver) == ("Unknown track", "Unknown car", "Unknown driver")
    # 50 m/s for 100 samples at 60 Hz, trapezoid over 99 intervals
    assert s.track_length == pytest.approx(50 * 99 / 60)


def test_track_name_fallback():
    s = Session(make_ibt("WeekendInfo:\n  TrackName: short_name\n  TrackLength: 1 km\n"), "a.ibt")
    assert s.track == "short_name"


def test_estimate_requires_complete_lap():
    with pytest.raises(ValueError, match="cannot determine track length"):
        Session(make_ibt(laps=1), "a.ibt")


def test_estimate_requires_speed_channel():

    ch = lap_channels()
    del ch["Speed"]
    with pytest.raises(ValueError, match="cannot determine track length"):
        Session(IbtFile.from_bytes(write_ibt(ch)), "a.ibt")


def test_best_lap_and_lookup():
    s = Session(make_ibt(YAML), "a.ibt")
    assert s.best_lap.number in (2, 3)  # equal times
    assert s.lap(3).number == 3
    with pytest.raises(KeyError):
        s.lap(99)
    assert len(s.trace(2, np.linspace(0, 1, 5)).time) == 5


def test_best_lap_none_without_valid_laps():
    pit = np.ones(400, bool)

    ibt = IbtFile.from_bytes(write_ibt(lap_channels(OnPitRoad=pit), session_info=YAML))
    assert Session(ibt, "a.ibt").best_lap is None


def test_store_add_get_all_and_evict():
    store = SessionStore(max_sessions=2)
    sessions = [Session(make_ibt(YAML), f"{i}.ibt") for i in range(3)]
    for s in sessions:
        assert store.add(s) is s
    assert store.all() == sessions[1:]
    assert store.get(sessions[2].id) is sessions[2]
    with pytest.raises(KeyError):
        store.get(sessions[0].id)
