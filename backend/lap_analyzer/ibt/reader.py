"""Read iRacing ``.ibt`` files into NumPy arrays.

The whole sample table is decoded with a single ``np.frombuffer`` call using a
structured dtype built from the file's own variable headers, so a 30-minute
session (100k+ records, ~250 channels) loads in milliseconds.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from functools import cached_property
from pathlib import Path
from typing import Any

import numpy as np
import yaml

from .format import DISK_HEADER, HEADER, VAR_HEADER, VAR_TYPES


class IbtFormatError(ValueError):
    """The bytes are not a readable .ibt file."""


@dataclass(frozen=True)
class Channel:
    name: str
    type: int
    count: int
    unit: str
    description: str


def _cstr(raw: bytes) -> str:
    return raw.split(b"\0", 1)[0].decode("latin-1")


_YAML_LOADER = getattr(yaml, "CSafeLoader", yaml.SafeLoader)


def parse_session_info(raw: str) -> dict[str, Any]:
    """Session YAML (track, car, drivers, ...). Empty if it fails to parse.

    iRacing's YAML is not always strictly valid (unquoted user-entered
    strings), so a parse failure must not make the telemetry unusable.
    """
    try:
        parsed = yaml.load(raw, Loader=_YAML_LOADER)  # CSafeLoader is the safe loader
    except yaml.YAMLError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def recorded_at(start_date: int, start_time: float) -> datetime | None:
    """When logging started, from the disk header: session start (time_t) + offset into it.

    None when the header carries no date (iRacing writes 0 for some files).
    """
    if start_date <= 0:
        return None
    try:
        return datetime.fromtimestamp(start_date + max(0.0, start_time), tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None


@dataclass(frozen=True)
class IbtMeta:
    """Everything needed to describe a file, read without touching the sample table."""

    start_date: int
    start_time: float
    lap_count: int
    session_info_raw: str

    @cached_property
    def session_info(self) -> dict[str, Any]:
        return parse_session_info(self.session_info_raw)

    @property
    def recorded_at(self) -> datetime | None:
        return recorded_at(self.start_date, self.start_time)


def read_meta(path: str | Path) -> IbtMeta:
    """Read only the headers and session YAML of an .ibt file (a few KB to ~100 KB)."""
    head_len = HEADER.itemsize + DISK_HEADER.itemsize
    with open(path, "rb") as f:
        head = f.read(head_len)
        if len(head) < head_len:
            raise IbtFormatError(f"file is {len(head)} bytes; an .ibt header alone is {head_len}")
        hdr = np.frombuffer(head, HEADER, count=1)[0]
        disk = np.frombuffer(head, DISK_HEADER, count=1, offset=HEADER.itemsize)[0]
        info_off, info_len = int(hdr["session_info_offset"]), int(hdr["session_info_len"])
        if info_off < head_len or not 0 < info_len <= 4 * 1024 * 1024:
            raise IbtFormatError("header has no readable session info")
        f.seek(info_off)
        raw = f.read(info_len)
    return IbtMeta(
        start_date=int(disk["start_date"]),
        start_time=float(disk["start_time"]),
        lap_count=int(disk["lap_count"]),
        session_info_raw=raw.split(b"\0", 1)[0].decode("latin-1"),
    )


class IbtFile:
    def __init__(
        self,
        *,
        tick_rate: int,
        channels: dict[str, Channel],
        records: np.ndarray,
        session_info_raw: str,
        start_date: int = 0,
        start_time: float = 0.0,
    ) -> None:
        self.start_date = start_date
        self.start_time = start_time
        self.tick_rate = tick_rate
        self.channels = channels
        self.records = records
        self.session_info_raw = session_info_raw

    @classmethod
    def open(cls, path: str | Path) -> IbtFile:
        return cls.from_bytes(Path(path).read_bytes())

    @classmethod
    def from_bytes(cls, buf: bytes) -> IbtFile:
        min_len = HEADER.itemsize + DISK_HEADER.itemsize
        if len(buf) < min_len:
            raise IbtFormatError(f"file is {len(buf)} bytes; an .ibt header alone is {min_len}")

        hdr = np.frombuffer(buf, HEADER, count=1)[0]
        disk = np.frombuffer(buf, DISK_HEADER, count=1, offset=HEADER.itemsize)[0]

        num_vars = int(hdr["num_vars"])
        var_header_offset = int(hdr["var_header_offset"])
        buf_len = int(hdr["buf_len"])
        if num_vars <= 0 or buf_len <= 0:
            raise IbtFormatError("header declares no channels")
        if var_header_offset + num_vars * VAR_HEADER.itemsize > len(buf):
            raise IbtFormatError("variable headers run past end of file")

        var_headers = np.frombuffer(buf, VAR_HEADER, count=num_vars, offset=var_header_offset)

        channels: dict[str, Channel] = {}
        names, formats, offsets = [], [], []
        for vh in var_headers:
            var_type = int(vh["type"])
            if var_type not in VAR_TYPES:
                raise IbtFormatError(f"unknown variable type {var_type}")
            name = _cstr(vh["name"])
            count = int(vh["count"])
            if name in channels:
                continue
            base = VAR_TYPES[var_type]
            names.append(name)
            formats.append(base if count == 1 else np.dtype((base, (count,))))
            offsets.append(int(vh["offset"]))
            channels[name] = Channel(
                name=name,
                type=var_type,
                count=count,
                unit=_cstr(vh["unit"]),
                description=_cstr(vh["desc"]),
            )

        record_dtype = np.dtype(
            {"names": names, "formats": formats, "offsets": offsets, "itemsize": buf_len}
        )

        data_offset = int(hdr["var_buf"][0]["buf_offset"])
        available = max(0, (len(buf) - data_offset) // buf_len)
        record_count = int(disk["record_count"])
        # Files from crashed sessions can have a stale record count; trust the file size.
        if record_count <= 0 or record_count > available:
            record_count = available
        records = np.frombuffer(buf, record_dtype, count=record_count, offset=data_offset)

        info_off = int(hdr["session_info_offset"])
        info_len = int(hdr["session_info_len"])
        session_info_raw = buf[info_off : info_off + info_len].split(b"\0", 1)[0].decode("latin-1")

        return cls(
            tick_rate=int(hdr["tick_rate"]),
            channels=channels,
            records=records,
            session_info_raw=session_info_raw,
            start_date=int(disk["start_date"]),
            start_time=float(disk["start_time"]),
        )

    @cached_property
    def session_info(self) -> dict[str, Any]:
        """Parsed session YAML (track, car, drivers, ...). Empty if it fails to parse."""
        return parse_session_info(self.session_info_raw)

    @property
    def recorded_at(self) -> datetime | None:
        return recorded_at(self.start_date, self.start_time)

    def __len__(self) -> int:
        return len(self.records)

    def __contains__(self, name: object) -> bool:
        return name in self.channels

    def __getitem__(self, name: str) -> np.ndarray:
        if name not in self.channels:
            raise KeyError(f"channel {name!r} not in file")
        return np.ascontiguousarray(self.records[name])
