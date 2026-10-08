import pytest
from pydantic import ValidationError

from lap_analyzer.models.lap_ref import LapRef


def test_lap_ref():
    ref = LapRef(session_id="abc", lap=2, lap_time=90.5, label="Lap 2")
    assert ref.model_dump()["lap_time"] == 90.5


def test_lap_ref_validates_types():
    with pytest.raises(ValidationError):
        LapRef(session_id="abc", lap="x", lap_time=1.0, label="")
