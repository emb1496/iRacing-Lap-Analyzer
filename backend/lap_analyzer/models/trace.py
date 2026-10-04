from __future__ import annotations

from pydantic import BaseModel


class Trace(BaseModel):
    time: list[float]
    speed: list[float]
    throttle: list[float] | None = None
    brake: list[float] | None = None
    gear: list[int] | None = None
    rpm: list[float] | None = None
    steering: list[float] | None = None
    lat: list[float] | None = None
    lon: list[float] | None = None
    # Mean tyre temperature (°C) per tyre keyed LF / RF / LR / RR, when the file logs it
    tyre_temp: dict[str, list[float]] | None = None
