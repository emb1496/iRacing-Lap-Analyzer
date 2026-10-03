from __future__ import annotations

from pydantic import BaseModel

from lap_analyzer.models.lap_summary import LapSummary


class SessionSummary(BaseModel):
    id: str
    filename: str
    track: str
    car: str
    driver: str
    track_length: float
    best_lap: int | None
    laps: list[LapSummary]
