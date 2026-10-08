import pytest
from pydantic import ValidationError

from lap_analyzer.models.trace import Trace


def test_only_time_and_speed_required():
    t = Trace(time=[0.0, 1.0], speed=[10.0, 20.0])
    assert t.throttle is None and t.tyre_temp is None


def test_requires_speed():
    with pytest.raises(ValidationError):
        Trace(time=[0.0])
