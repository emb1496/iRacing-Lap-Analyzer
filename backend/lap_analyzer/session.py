"""A loaded telemetry session and an in-memory store of them."""

from __future__ import annotations

import re
import threading
import uuid
from typing import Any

import numpy as np

from .analysis import LapInfo, LapTrace, resample_lap, split_laps
from .ibt import IbtFile


def _parse_track_length(info: dict[str, Any]) -> float | None:
    raw = str(info.get("WeekendInfo", {}).get("TrackLength", ""))
    match = re.match(r"\s*([\d.]+)\s*(km|mi)", raw)
    if not match:
        return None
    value = float(match.group(1))
    return value * (1609.344 if match.group(2) == "mi" else 1000.0)


class Session:
    def __init__(self, ibt: IbtFile, filename: str) -> None:
        self.id = uuid.uuid4().hex[:12]
        self.filename = filename
        self.ibt = ibt
        self.laps = split_laps(ibt)

        info = ibt.session_info
        weekend = info.get("WeekendInfo", {})
        self.track = weekend.get("TrackDisplayName") or weekend.get("TrackName") or "Unknown track"
        drivers = info.get("DriverInfo", {})
        my_idx = drivers.get("DriverCarIdx")
        me = next((d for d in drivers.get("Drivers", []) if d.get("CarIdx") == my_idx), {})
        self.car = me.get("CarScreenName", "Unknown car")
        self.driver = me.get("UserName", "Unknown driver")
        self.track_length = _parse_track_length(info) or self._estimate_track_length()

    def _estimate_track_length(self) -> float:
        """Fallback when the session YAML is missing: integrate speed over a complete lap."""
        for lap in self.laps:
            if lap.complete and "Speed" in self.ibt:
                sl = slice(lap.start_idx, lap.end_idx)
                v, t = self.ibt["Speed"][sl], self.ibt["SessionTime"][sl]
                return float(np.sum(np.diff(t) * (v[1:] + v[:-1]) / 2))
        raise ValueError("cannot determine track length: no complete lap with a Speed channel")

    @property
    def best_lap(self) -> LapInfo | None:
        valid = [lap for lap in self.laps if lap.valid]
        return min(valid, key=lambda lap: lap.time or np.inf) if valid else None

    def lap(self, number: int) -> LapInfo:
        for lap in self.laps:
            if lap.number == number:
                return lap
        raise KeyError(f"lap {number} not in session")

    def trace(self, number: int, pct_grid: np.ndarray) -> LapTrace:
        return resample_lap(self.ibt, self.lap(number), pct_grid)


class SessionStore:
    """Process-local session cache. Swap for Redis/S3 if this ever runs multi-instance."""

    def __init__(self, max_sessions: int = 20) -> None:
        self._sessions: dict[str, Session] = {}
        self._lock = threading.Lock()
        self._max = max_sessions

    def add(self, session: Session) -> Session:
        with self._lock:
            self._sessions[session.id] = session
            while len(self._sessions) > self._max:  # evict oldest
                self._sessions.pop(next(iter(self._sessions)))
        return session

    def get(self, session_id: str) -> Session:
        with self._lock:
            return self._sessions[session_id]

    def all(self) -> list[Session]:
        with self._lock:
            return list(self._sessions.values())
