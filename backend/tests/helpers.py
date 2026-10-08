"""Small builders for hand-made telemetry files."""

from __future__ import annotations

import numpy as np

from lap_analyzer.ibt import IbtFile, write_ibt


def lap_channels(laps: int = 4, n: int = 100, **extra: np.ndarray) -> dict:
    """Channels for ``laps`` laps of ``n`` samples. First and last laps are partial."""
    total = laps * n
    base = {
        "SessionTime": (np.arange(total, dtype=np.float64) / 60, "s", ""),
        "Lap": (np.repeat(np.arange(1, laps + 1, dtype=np.int32), n), "", ""),
        "LapDistPct": ((np.arange(total) % n / n).astype(np.float32), "", ""),
        "Speed": (np.full(total, 50.0, np.float32), "m/s", ""),
    }
    for name, values in extra.items():
        base[name] = (values, "", "")
    return base


def make_ibt(session_info: str = "", **kwargs) -> IbtFile:
    return IbtFile.from_bytes(write_ibt(lap_channels(**kwargs), session_info=session_info))
