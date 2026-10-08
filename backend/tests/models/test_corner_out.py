import pytest
from pydantic import ValidationError

from lap_analyzer.models.corner_out import CornerOut, InsightOut, ReasonOut


def test_reason_value_optional():
    assert ReasonOut(kind="brake_new").value is None


def test_corner_round_trip():
    data = dict(
        number=1, start=0, apex=1, end=2, time_delta=0.1, ref_min_speed=1, cmp_min_speed=1,
        ref_brake=None, cmp_brake=None, ref_peak_brake=0, cmp_peak_brake=0,
        ref_full_throttle=None, cmp_full_throttle=None,
        insight={"even": False, "reasons": [{"kind": "apex_speed", "value": -3.0}]},
    )  # fmt: skip
    corner = CornerOut(**data)
    assert corner.insight == InsightOut(
        even=False, reasons=[ReasonOut(kind="apex_speed", value=-3)]
    )


def test_corner_requires_fields():
    with pytest.raises(ValidationError):
        CornerOut(number=1)
