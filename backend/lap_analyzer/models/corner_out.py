from __future__ import annotations

from pydantic import BaseModel


class CornerOut(BaseModel):
    number: int
    start: float
    apex: float
    end: float
    time_delta: float
    ref_min_speed: float
    cmp_min_speed: float
    ref_brake: float | None
    cmp_brake: float | None
    ref_peak_brake: float
    cmp_peak_brake: float
    ref_full_throttle: float | None
    cmp_full_throttle: float | None
    insight: str
