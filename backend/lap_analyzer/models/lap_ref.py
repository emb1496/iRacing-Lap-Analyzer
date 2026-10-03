from __future__ import annotations

from pydantic import BaseModel


class LapRef(BaseModel):
    session_id: str
    lap: int
    lap_time: float
    label: str
