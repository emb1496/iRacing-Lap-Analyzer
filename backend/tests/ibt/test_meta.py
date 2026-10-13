from datetime import datetime, timezone

import pytest

from lap_analyzer.ibt import IbtFile, IbtFormatError, read_meta, write_ibt
from lap_analyzer.ibt.reader import recorded_at
from tests.helpers import lap_channels

YAML = "WeekendInfo:\n TrackName: x\n"
START = 1_767_000_000


def _file(tmp_path, start_date=START, session_info=YAML):
    path = tmp_path / "a.ibt"
    path.write_bytes(write_ibt(lap_channels(), session_info=session_info, start_date=start_date))
    return path


def test_recorded_at_is_session_start_plus_offset():
    got = recorded_at(START, 90.5)
    assert got == datetime.fromtimestamp(START + 90.5, tz=timezone.utc)
    assert got.tzinfo is not None


@pytest.mark.parametrize("start_date", [0, -5, 2**62])
def test_recorded_at_none_without_a_usable_date(start_date):
    assert recorded_at(start_date, 0.0) is None


def test_ibt_file_exposes_recording_date(tmp_path):
    ibt = IbtFile.open(_file(tmp_path))
    assert ibt.start_date == START
    # lap_channels() starts SessionTime at 0
    assert ibt.recorded_at == datetime.fromtimestamp(START, tz=timezone.utc)


def test_ibt_file_without_date(tmp_path):
    assert IbtFile.open(_file(tmp_path, start_date=0)).recorded_at is None


def test_read_meta_reads_headers_only(tmp_path):
    meta = read_meta(_file(tmp_path))
    assert meta.start_date == START
    assert meta.recorded_at == datetime.fromtimestamp(START, tz=timezone.utc)
    assert meta.session_info == {"WeekendInfo": {"TrackName": "x"}}


def test_read_meta_tolerates_bad_yaml(tmp_path):
    assert read_meta(_file(tmp_path, session_info="a: [unclosed")).session_info == {}


def test_read_meta_rejects_short_file(tmp_path):
    path = tmp_path / "short.ibt"
    path.write_bytes(b"\0" * 20)
    with pytest.raises(IbtFormatError, match="header alone"):
        read_meta(path)


def test_read_meta_rejects_missing_session_info(tmp_path):
    path = tmp_path / "zero.ibt"
    path.write_bytes(b"\0" * 200)
    with pytest.raises(IbtFormatError, match="session info"):
        read_meta(path)
