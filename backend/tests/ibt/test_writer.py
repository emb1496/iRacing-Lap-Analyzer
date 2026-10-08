import numpy as np
import pytest

from lap_analyzer.ibt import IbtFile, write_ibt
from tests.helpers import lap_channels


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
