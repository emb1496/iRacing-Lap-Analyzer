from __future__ import annotations

from pydantic import BaseModel


class TyreOut(BaseModel):
    inner: float  # °C, lap median
    middle: float
    outer: float
    pressure: float | None = None  # kPa, lap median


class ConditionsOut(BaseModel):
    track_temp: float | None = None  # °C
    air_temp: float | None = None  # °C
    wetness: int | None = None  # 1 (dry) .. 7 (extremely wet)
    wind_speed: float | None = None  # km/h
    humidity: float | None = None  # %
    tyres: dict[str, TyreOut] = {}  # keyed LF / RF / LR / RR; empty if not logged
