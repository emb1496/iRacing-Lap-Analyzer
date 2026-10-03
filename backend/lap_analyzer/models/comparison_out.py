from __future__ import annotations

from pydantic import BaseModel

from lap_analyzer.models.corner_out import CornerOut
from lap_analyzer.models.lap_ref import LapRef
from lap_analyzer.models.trace import Trace


class ComparisonOut(BaseModel):
    track: str
    track_length: float
    ref: LapRef
    cmp: LapRef
    distance: list[float]
    delta: list[float]
    ref_trace: Trace
    cmp_trace: Trace
    corners: list[CornerOut]
