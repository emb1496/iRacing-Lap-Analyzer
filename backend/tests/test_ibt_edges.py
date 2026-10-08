import numpy as np
import pytest
from helpers import lap_channels

from lap_analyzer.ibt import IbtFile, IbtFormatError, write_ibt
from lap_analyzer.ibt.format import DISK_HEADER, HEADER, VAR_HEADER


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


def test_writer_requires_channels():
    with pytest.raises(ValueError, match="at least one"):
        write_ibt({})


def test_writer_requires_equal_lengths():
    with pytest.raises(ValueError, match="same length"):
        write_ibt({"a": (np.zeros(2, np.float32), "", ""), "b": (np.zeros(3, np.float32), "", "")})


def test_writer_rejects_unsupported_dtype():
    with pytest.raises(TypeError, match="unsupported dtype"):
        write_ibt({"a": (np.zeros(2, np.int64), "", "")})


def test_empty_file_has_no_records():
    ibt = IbtFile.from_bytes(write_ibt(lap_channels(laps=0)))
    assert len(ibt) == 0
