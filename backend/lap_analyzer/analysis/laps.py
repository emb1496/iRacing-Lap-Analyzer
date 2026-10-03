"""Split a session into laps and resample laps onto a common distance grid.

Telemetry is sampled in *time* (60 Hz), but two laps can only be compared
point by point in *distance*: "where on track was I 1.2 s slower?" Each lap is
therefore re-indexed by lap-distance percentage before any comparison.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from ..ibt import IbtFile, IbtFormatError

REQUIRED_CHANNELS = ("SessionTime", "Lap", "LapDistPct")
TRACE_CHANNELS = ("Speed", "Throttle", "Brake", "Gear", "RPM", "SteeringWheelAngle", "Lat", "Lon")


@dataclass(frozen=True)
class LapInfo:
    number: int
    start_idx: int  # first sample of the lap
    end_idx: int  # one past the last sample
    start_time: float | None  # session time the car crossed the line, if seen
    time: float | None  # lap time; None for partial laps
    valid: bool  # a complete lap that never touched pit road

    @property
    def complete(self) -> bool:
        return self.time is not None


@dataclass(frozen=True)
class LapTrace:
    """One lap resampled onto a lap-distance-percentage grid."""

    pct: np.ndarray
    time: np.ndarray  # elapsed seconds since the start line at each grid point
    channels: dict[str, np.ndarray]


def _line_crossing_time(t: np.ndarray, pct: np.ndarray, i: int) -> float:
    """Session time the car crossed the start line between samples ``i - 1`` and ``i``.

    At 60 Hz the car covers ~1 m per sample, so taking the first sample of the
    new lap would put every lap time off by up to 16 ms. Interpolating between
    the samples either side of the line removes that error.
    """
    before = 1.0 - pct[i - 1]
    after = pct[i]
    gap = before + after
    frac = before / gap if gap > 0 else 0.0
    return float(t[i - 1] + frac * (t[i] - t[i - 1]))


def split_laps(ibt: IbtFile) -> list[LapInfo]:
    missing = [c for c in REQUIRED_CHANNELS if c not in ibt]
    if missing:
        raise IbtFormatError(f"missing required channels: {', '.join(missing)}")
    if len(ibt) == 0:
        return []

    t = ibt["SessionTime"].astype(float)
    lap = ibt["Lap"].astype(int)
    pct = ibt["LapDistPct"].astype(float)
    pit = ibt["OnPitRoad"].astype(bool) if "OnPitRoad" in ibt else np.zeros(len(t), bool)

    boundaries = np.flatnonzero(np.diff(lap) != 0) + 1
    starts = np.concatenate([[0], boundaries])
    ends = np.concatenate([boundaries, [len(lap)]])

    def crossing(i: int) -> float | None:
        # A real line crossing: lap counter +1 and position wraps from ~1.0 to ~0.0.
        if 0 < i < len(lap) and lap[i] == lap[i - 1] + 1 and pct[i - 1] > 0.9 and pct[i] < 0.1:
            return _line_crossing_time(t, pct, i)
        return None

    laps = []
    for start, end in zip(starts, ends, strict=True):
        t_start, t_end = crossing(int(start)), crossing(int(end))
        lap_time = t_end - t_start if t_start is not None and t_end is not None else None
        on_track = bool(np.all(pct[start:end] >= 0))
        laps.append(
            LapInfo(
                number=int(lap[start]),
                start_idx=int(start),
                end_idx=int(end),
                start_time=t_start,
                time=lap_time,
                valid=lap_time is not None and on_track and not pit[start:end].any(),
            )
        )
    return laps


def resample_lap(ibt: IbtFile, lap: LapInfo, pct_grid: np.ndarray) -> LapTrace:
    if not lap.complete or lap.start_time is None or lap.time is None:
        raise ValueError(f"lap {lap.number} is incomplete")
    sl = slice(lap.start_idx, lap.end_idx)
    # The car never goes backwards; clamp tiny reversals from sensor noise so interp is valid.
    pct = np.maximum.accumulate(ibt["LapDistPct"][sl].astype(float))
    elapsed = ibt["SessionTime"][sl].astype(float) - lap.start_time

    time = np.interp(
        pct_grid,
        np.concatenate([[0.0], pct, [1.0]]),
        np.concatenate([[0.0], elapsed, [lap.time]]),
    )
    channels = {
        name: np.interp(pct_grid, pct, ibt[name][sl].astype(float))
        for name in TRACE_CHANNELS
        if name in ibt
    }
    if "Gear" in channels:
        channels["Gear"] = np.round(channels["Gear"])
    return LapTrace(pct=pct_grid, time=time, channels=channels)
