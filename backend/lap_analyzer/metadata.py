"""Who/where/what of a recording, pulled from the session YAML."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SessionMeta:
    track: str
    car: str
    driver: str
    session_type: str | None
    sub_session_id: int | None


def describe(info: dict[str, Any]) -> SessionMeta:
    """Fields are optional in real files, so every lookup has a fallback."""
    weekend = info.get("WeekendInfo") or {}
    drivers = info.get("DriverInfo") or {}
    my_idx = drivers.get("DriverCarIdx")
    me = next((d for d in drivers.get("Drivers") or [] if d.get("CarIdx") == my_idx), {})
    event_type = weekend.get("EventType")
    sub_session = weekend.get("SubSessionID")
    return SessionMeta(
        track=weekend.get("TrackDisplayName") or weekend.get("TrackName") or "Unknown track",
        car=me.get("CarScreenName", "Unknown car"),
        driver=me.get("UserName", "Unknown driver"),
        session_type=str(event_type) if event_type else None,
        sub_session_id=sub_session if isinstance(sub_session, int) and sub_session > 0 else None,
    )
