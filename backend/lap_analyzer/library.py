"""Find and describe the .ibt files in the iRacing telemetry folder.

Nothing here is persisted: the folder is resolved from the environment on each
request and descriptions are cached in memory for the life of the process.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .ibt import IbtFormatError, read_meta
from .metadata import describe

ENV_VAR = "IRACING_TELEMETRY_DIR"


@dataclass(frozen=True)
class LibraryEntry:
    name: str
    size: int
    modified: datetime
    track: str
    car: str
    driver: str
    recorded_at: datetime
    session_type: str | None
    lap_count: int | None


def _windows_documents() -> Path | None:  # pragma: no cover - Windows only
    """The real Documents folder, which OneDrive may have moved away from ~/Documents."""
    try:
        import ctypes
        from ctypes import wintypes

        buf = ctypes.c_wchar_p()
        folder_id = ctypes.c_char * 16
        # FOLDERID_Documents {FDD39AD0-238F-46AF-ADB4-6C85480369C7}
        guid = folder_id(*bytes.fromhex("d09ad3fd8f23af46adb46c85480369c7"))
        shell32 = ctypes.windll.shell32  # type: ignore[attr-defined]
        shell32.SHGetKnownFolderPath.argtypes = [
            ctypes.c_void_p,
            wintypes.DWORD,
            wintypes.HANDLE,
            ctypes.POINTER(ctypes.c_wchar_p),
        ]
        if shell32.SHGetKnownFolderPath(ctypes.byref(guid), 0, None, ctypes.byref(buf)) == 0:
            return Path(buf.value) if buf.value else None
    except Exception:
        return None
    return None


def candidate_dirs() -> list[Path]:
    home = Path.home()
    documents = [_windows_documents()] if sys.platform == "win32" else []
    documents += [home / "Documents", home / "OneDrive" / "Documents"]
    return [d / "iRacing" / "telemetry" for d in documents if d is not None]


def telemetry_dir() -> Path | None:
    """``$IRACING_TELEMETRY_DIR`` if set, else the first standard location that exists."""
    override = os.environ.get(ENV_VAR)
    if override:
        path = Path(override).expanduser()
        return path if path.is_dir() else None
    return next((d for d in candidate_dirs() if d.is_dir()), None)


_cache: dict[tuple[str, int, int], LibraryEntry | None] = {}


def _describe(path: Path, stat: os.stat_result) -> LibraryEntry | None:
    key = (str(path), stat.st_mtime_ns, stat.st_size)
    if key not in _cache:
        modified = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
        try:
            meta = read_meta(path)
        except (IbtFormatError, OSError):
            _cache[key] = None
        else:
            info = describe(meta.session_info)
            _cache[key] = LibraryEntry(
                name=path.name,
                size=stat.st_size,
                modified=modified,
                track=info.track,
                car=info.car,
                driver=info.driver,
                recorded_at=meta.recorded_at or modified,
                session_type=info.session_type,
                lap_count=meta.lap_count or None,
            )
    return _cache[key]


def scan(directory: Path) -> list[LibraryEntry]:
    """Describe every readable .ibt directly inside ``directory``, newest recording first."""
    entries = []
    try:
        children = sorted(directory.iterdir())
    except OSError:
        return []
    for path in children:
        if path.suffix.lower() != ".ibt":
            continue
        try:
            stat = path.stat()
        except OSError:
            continue
        if not path.is_file():
            continue
        entry = _describe(path, stat)
        if entry is not None:
            entries.append(entry)
    return sorted(entries, key=lambda e: e.recorded_at, reverse=True)


def resolve(directory: Path, name: str) -> Path:
    """Map a bare file name to a file inside ``directory``; never anything outside it."""
    if not name or name != Path(name).name or Path(name).suffix.lower() != ".ibt":
        raise ValueError("expected the name of an .ibt file in the telemetry folder")
    path = directory / name
    if not path.is_file():
        raise FileNotFoundError(name)
    return path
