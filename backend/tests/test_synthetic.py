import numpy as np
import pytest

from lap_analyzer.ibt import IbtFile
from lap_analyzer.synthetic import (
    DriverProfile,
    demo_session,
    drive_lap,
    generate_session,
    make_track,
)


def test_track_is_closed_and_has_a_length():
    track = make_track()
    assert track.length == pytest.approx(len(track.x) * track.step)
    assert len(track.x) == len(track.y) == len(track.curvature)
    assert track.length > 1000


def test_drive_lap_respects_driver_profile():
    track = make_track()
    fast = drive_lap(track, DriverProfile())
    slow = drive_lap(track, DriverProfile(grip=0.8, braking=0.8))
    assert fast["speed"].mean() > slow["speed"].mean()


def test_demo_session_is_deterministic_and_parses():
    a, b = demo_session(), demo_session()
    assert a.ibt == b.ibt
    ibt = IbtFile.from_bytes(a.ibt)
    assert {"Speed", "Lap", "LapDistPct", "SessionTime", "Gear"} <= set(ibt.channels)
    assert len(a.lap_times) == 3 and all(t > 30 for t in a.lap_times)


def test_generate_session_has_partial_out_and_in_laps():
    ibt = IbtFile.from_bytes(generate_session((DriverProfile(),)).ibt)
    laps = np.unique(ibt["Lap"])
    assert laps.tolist() == [0, 1, 2]
