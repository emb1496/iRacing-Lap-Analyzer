import numpy as np
import pytest

from lap_analyzer.ibt import IbtFile, IbtFormatError, write_ibt


def test_round_trip_preserves_values_and_metadata():
    n = 500
    speed = np.linspace(0, 80, n, dtype=np.float32)
    lap = np.repeat(np.arange(5, dtype=np.int32), 100)
    time = np.arange(n, dtype=np.float64) / 60
    pit = np.arange(n) < 50
    data = write_ibt(
        {
            "SessionTime": (time, "s", "Seconds since session start"),
            "Speed": (speed, "m/s", "GPS vehicle speed"),
            "Lap": (lap, "", "Laps started count"),
            "OnPitRoad": (pit, "", "Is the player car on pit road"),
        },
        tick_rate=60,
        session_info="WeekendInfo:\n TrackName: test\n",
    )

    ibt = IbtFile.from_bytes(data)

    assert len(ibt) == n
    assert ibt.tick_rate == 60
    np.testing.assert_array_equal(ibt["Speed"], speed)
    np.testing.assert_array_equal(ibt["Lap"], lap)
    np.testing.assert_array_equal(ibt["SessionTime"], time)
    np.testing.assert_array_equal(ibt["OnPitRoad"], pit)
    assert ibt.channels["Speed"].unit == "m/s"
    assert ibt.channels["Lap"].description == "Laps started count"
    assert ibt.session_info == {"WeekendInfo": {"TrackName": "test"}}


def test_truncated_file_keeps_whole_records_only(demo):
    full = IbtFile.from_bytes(demo.ibt)
    truncated = IbtFile.from_bytes(demo.ibt[:-1000])
    assert 0 < len(truncated) < len(full)
    np.testing.assert_array_equal(truncated["Speed"], full["Speed"][: len(truncated)])


def test_rejects_garbage():
    with pytest.raises(IbtFormatError):
        IbtFile.from_bytes(b"not an ibt file")


def test_invalid_session_yaml_does_not_break_telemetry():
    data = write_ibt(
        {"Speed": (np.zeros(3, np.float32), "m/s", "")},
        session_info="DriverInfo:\n UserName: [unclosed: bracket\n",
    )
    ibt = IbtFile.from_bytes(data)
    assert ibt.session_info == {}
    assert len(ibt["Speed"]) == 3


def test_unknown_channel_raises_key_error(demo_ibt):
    with pytest.raises(KeyError):
        demo_ibt["NotAChannel"]
