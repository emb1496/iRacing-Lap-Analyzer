from __future__ import annotations

from pydantic import BaseModel


class LapSummary(BaseModel):
    number: int
    time: float | None
    valid: bool
