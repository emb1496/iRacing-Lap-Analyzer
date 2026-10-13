from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class LibraryFile(BaseModel):
    name: str  # file name inside the telemetry folder; also the id for /sessions/from-library
    size: int
    modified: datetime
    track: str
    car: str
    driver: str
    recorded_at: datetime
    session_type: str | None
    lap_count: int | None


class LibraryOut(BaseModel):
    directory: str | None
    files: list[LibraryFile]


class LibraryLoad(BaseModel):
    name: str
