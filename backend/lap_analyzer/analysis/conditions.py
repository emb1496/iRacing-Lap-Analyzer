"""Track conditions and tyre temperatures for a lap.

Weather channels (track/air temperature, wetness, wind, humidity) are sampled at the start/finish
line, so they are summarised per lap. Tyre temperatures vary around the lap, so they are resampled
onto the distance grid like any other trace and summarised per tyre from that.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

import numpy as np

if TYPE_CHECKING:  # laps imports this module for tyre_channel_names
    from .laps import LapInfo, LapTrace

TYRE_CORNERS = ("LF", "RF", "LR", "RR")
TYRE_POSITIONS = ("inner", "middle", "outer")
MS_TO_KMH = 3.6


class _HasChannels(Protocol):
    def __contains__(self, name: object, /) -> bool: ...
    def __getitem__(self, name: str, /) -> np.ndarray: ...


def tyre_channel_names(ibt: _HasChannels) -> dict[str, str]:
    """Map ``"LF_inner"``-style keys to the file's tyre temperature channels.

    iRacing names the three bands left/middle/right as seen from the driver's seat, so on the
    left-hand tyres "left" is the outside edge and on the right-hand tyres it is the inside.
    Surface temperature is preferred because it is live on track; the carcass channels only
    refresh in the pits, so they sit flat for a whole stint. (Surface readings do spike briefly,
    to ~200 °C, which is why lap summaries use the median.)
    """
    names: dict[str, str] = {}
    for corner in TYRE_CORNERS:
        for prefix in ("temp", "tempC"):  # surface, then carcass
            left, mid, right = (f"{corner}{prefix}{band}" for band in "LMR")
            if all(n in ibt for n in (left, mid, right)):
                inner, outer = (right, left) if corner[0] == "L" else (left, right)
                names[f"{corner}_inner"] = inner
                names[f"{corner}_middle"] = mid
                names[f"{corner}_outer"] = outer
                break
        if f"{corner}pressure" in ibt:
            names[f"{corner}_pressure"] = f"{corner}pressure"
    return names


@dataclass(frozen=True)
class TyreSummary:
    inner: float  # °C, lap median
    middle: float
    outer: float
    pressure: float | None  # kPa, lap median


@dataclass(frozen=True)
class Conditions:
    track_temp: float | None  # °C
    air_temp: float | None  # °C
    wetness: int | None  # irsdk_TrackWetness, 1 (dry) .. 7 (extremely wet)
    wind_speed: float | None  # km/h
    humidity: float | None  # %
    tyres: dict[str, TyreSummary]  # empty when the file has no tyre temperature channels


def _mean(ibt: _HasChannels, names: tuple[str, ...], sl: slice, scale: float = 1.0) -> float | None:
    for name in names:
        if name in ibt:
            return float(np.mean(ibt[name][sl].astype(float))) * scale
    return None


def tyre_summaries(trace: LapTrace) -> dict[str, TyreSummary]:
    out = {}
    for corner in TYRE_CORNERS:
        bands = [trace.channels.get(f"{corner}_{pos}") for pos in TYRE_POSITIONS]
        if any(b is None for b in bands):
            continue
        pressure = trace.channels.get(f"{corner}_pressure")
        out[corner] = TyreSummary(
            *(float(np.median(b)) for b in bands),  # type: ignore[arg-type]
            pressure=float(np.median(pressure)) if pressure is not None else None,
        )
    return out


def lap_conditions(ibt: _HasChannels, lap: LapInfo, trace: LapTrace) -> Conditions:
    sl = slice(lap.start_idx, lap.end_idx)
    humidity = _mean(ibt, ("RelativeHumidity",), sl)
    wetness = ibt["TrackWetness"][sl].max() if "TrackWetness" in ibt else None
    return Conditions(
        track_temp=_mean(ibt, ("TrackTempCrew", "TrackTemp"), sl),
        air_temp=_mean(ibt, ("AirTemp",), sl),
        wetness=int(wetness) if wetness is not None and wetness > 0 else None,  # 0 = unknown
        wind_speed=_mean(ibt, ("WindVel",), sl, MS_TO_KMH),
        # iRacing reports a 0..1 fraction
        humidity=humidity * 100 if humidity is not None else None,
        tyres=tyre_summaries(trace),
    )
