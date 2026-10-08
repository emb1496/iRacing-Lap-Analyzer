import numpy as np
import pytest

from lap_analyzer.ibt import IbtFile, IbtFormatError, write_ibt
from lap_analyzer.ibt.format import DISK_HEADER, HEADER, VAR_HEADER
from tests.helpers import lap_channels


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


def _good() -> bytes:
    return write_ibt(lap_channels(laps=1, n=10))


def _patch(data: bytes, dtype: np.dtype, offset: int, **fields) -> bytes:
    buf = bytearray(data)
    rec = np.frombuffer(buf, dtype, count=1, offset=offset)
    for key, value in fields.items():
        rec[key] = value
    return bytes(buf)


def test_open_reads_from_path(tmp_path):
    path = tmp_path / "x.ibt"
    path.write_bytes(_good())
    assert len(IbtFile.open(path)) == 10
    assert len(IbtFile.open(str(path))) == 10


def test_header_without_channels_rejected():
    with pytest.raises(IbtFormatError, match="no channels"):
        IbtFile.from_bytes(_patch(_good(), HEADER, 0, num_vars=0))


def test_variable_headers_past_end_rejected():
    with pytest.raises(IbtFormatError, match="past end"):
        IbtFile.from_bytes(_patch(_good(), HEADER, 0, var_header_offset=10**6))


def test_unknown_variable_type_rejected():
    off = HEADER.itemsize + DISK_HEADER.itemsize
    with pytest.raises(IbtFormatError, match="unknown variable type"):
        IbtFile.from_bytes(_patch(_good(), VAR_HEADER, off, type=42))


def test_duplicate_channel_names_keep_first():
    off = HEADER.itemsize + DISK_HEADER.itemsize
    data = _patch(_good(), VAR_HEADER, off + VAR_HEADER.itemsize, name=b"SessionTime")
    ibt = IbtFile.from_bytes(data)
    assert "Lap" not in ibt
    assert ibt.channels["SessionTime"].type == 5


@pytest.mark.parametrize("count", [0, 10**6])
def test_bad_record_count_falls_back_to_file_size(count):
    data = _patch(_good(), DISK_HEADER, HEADER.itemsize, record_count=count)
    assert len(IbtFile.from_bytes(data)) == 10


def test_non_mapping_session_yaml_is_empty():
    data = write_ibt({"Speed": (np.zeros(2, np.float32), "", "")}, session_info="- a\n- b\n")
    assert IbtFile.from_bytes(data).session_info == {}
