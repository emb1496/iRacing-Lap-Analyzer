import numpy as np
import pytest
from helpers import lap_channels, make_ibt

from lap_analyzer.analysis import resample_lap, split_laps
from lap_analyzer.ibt import IbtFile, IbtFormatError, write_ibt

GRID = np.linspace(0, 1, 11)


def test_split_requires_core_channels():
    ibt = IbtFile.from_bytes(write_ibt({"Speed": (np.zeros(3, np.float32), "", "")}))
    with pytest.raises(IbtFormatError, match="missing required channels"):
        split_laps(ibt)


def test_split_empty_file():
    assert split_laps(make_ibt(laps=0)) == []


def test_split_marks_partial_and_complete_laps():
    laps = split_laps(make_ibt(laps=4))
    assert [lap.complete for lap in laps] == [False, True, True, False]
    assert laps[1].time == pytest.approx(100 / 60)
    assert laps[1].valid and not laps[0].valid


def test_pit_road_invalidates_lap():
    pit = np.zeros(400, bool)
    pit[150] = True
    ibt = IbtFile.from_bytes(write_ibt(lap_channels(laps=4, OnPitRoad=pit)))
    assert [lap.valid for lap in split_laps(ibt)] == [False, False, True, False]


def test_negative_lap_distance_invalidates_lap():
    pct = lap_channels(laps=4)["LapDistPct"][0].copy()
    pct[150] = -1
    ibt = IbtFile.from_bytes(write_ibt(lap_channels(laps=4, LapDistPct=pct)))
    assert not split_laps(ibt)[1].valid


def test_resample_rejects_incomplete_lap():
    ibt = make_ibt()
    with pytest.raises(ValueError, match="incomplete"):
        resample_lap(ibt, split_laps(ibt)[0], GRID)


def test_resample_without_gear_channel():
    ibt = make_ibt()
    trace = resample_lap(ibt, split_laps(ibt)[1], GRID)
    assert "Gear" not in trace.channels
    assert trace.time[0] == 0 and trace.time[-1] == pytest.approx(100 / 60)
    np.testing.assert_allclose(trace.channels["Speed"], 50.0)


def test_resample_gear_holds_last_gear_through_neutral():
    gear = np.zeros(400, np.int32)
    gear[100:200] = 2
    gear[130:140] = 0  # mid-shift neutral
    gear[200:] = 3
    ibt = IbtFile.from_bytes(write_ibt(lap_channels(laps=4, Gear=gear)))
    trace = resample_lap(ibt, split_laps(ibt)[1], np.linspace(0, 0.99, 100))
    g = trace.channels["Gear"]
    assert set(g) == {2.0}
    assert g[35] == 2  # inside the neutral gap


def test_resample_gear_all_neutral():
    ibt = IbtFile.from_bytes(write_ibt(lap_channels(laps=4, Gear=np.zeros(400, np.int32))))
    trace = resample_lap(ibt, split_laps(ibt)[1], GRID)
    assert not trace.channels["Gear"].any()


def test_resample_gear_leading_gap_takes_first_valid():
    gear = np.zeros(400, np.int32)
    gear[150:] = 4
    ibt = IbtFile.from_bytes(write_ibt(lap_channels(laps=4, Gear=gear)))
    trace = resample_lap(ibt, split_laps(ibt)[1], GRID)
    assert set(trace.channels["Gear"]) == {4.0}
