"""Derive odd-but-plausible telemetry files from a good one, to upload to the running server."""

from __future__ import annotations

import numpy as np

from lap_analyzer.ibt import IbtFile, write_ibt
from lap_analyzer.ibt.format import DISK_HEADER, HEADER, VAR_HEADER


def rebuild(
    data: bytes,
    *,
    drop: tuple[str, ...] = (),
    add: dict[str, tuple[np.ndarray, str, str]] | None = None,
    replace: dict[str, np.ndarray] | None = None,
    session_info: str | None = None,
) -> bytes:
    """Rewrite ``data`` with channels removed, added or replaced, and optionally new YAML."""
    ibt = IbtFile.from_bytes(data)
    channels = {
        name: (ibt[name], ch.unit, ch.description)
        for name, ch in ibt.channels.items()
        if name not in drop
    }
    for name, values in (replace or {}).items():
        channels[name] = (values, channels[name][1], channels[name][2])
    channels.update(add or {})
    info = ibt.session_info_raw if session_info is None else session_info
    return write_ibt(channels, tick_rate=ibt.tick_rate, session_info=info)


def patch_header(data: bytes, **fields: int) -> bytes:
    """Overwrite fields of the main header (e.g. ``num_vars=0``)."""
    buf = bytearray(data)
    hdr = np.frombuffer(buf, HEADER, count=1)
    for name, value in fields.items():
        hdr[0][name] = value
    return bytes(buf)


def patch_disk_header(data: bytes, **fields: int) -> bytes:
    buf = bytearray(data)
    disk = np.frombuffer(buf, DISK_HEADER, count=1, offset=HEADER.itemsize)
    for name, value in fields.items():
        disk[0][name] = value
    return bytes(buf)


def patch_var_header(data: bytes, index: int, **fields: int | bytes) -> bytes:
    """Overwrite fields of one variable header (``index`` counts from the end if negative)."""
    buf = bytearray(data)
    hdr = np.frombuffer(buf, HEADER, count=1)[0]
    vars_ = np.frombuffer(
        buf, VAR_HEADER, count=int(hdr["num_vars"]), offset=int(hdr["var_header_offset"])
    )
    for name, value in fields.items():
        vars_[index][name] = value
    return bytes(buf)
