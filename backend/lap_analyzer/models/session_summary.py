from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from lap_analyzer.models.lap_summary import LapSummary


class SessionSummary(BaseModel):
    id: str
    filename: str
    track: str
    car: str
    driver: str
    recorded_at: datetime | None = None
    session_type: str | None = None
    track_length: float
    best_lap: int | None
    laps: list[LapSummary]
