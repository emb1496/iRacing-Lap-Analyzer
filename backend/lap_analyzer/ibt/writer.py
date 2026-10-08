"""Write ``.ibt`` files. Used to generate demo data and test fixtures."""

from __future__ import annotations

from collections.abc import Mapping

import numpy as np

from .format import DISK_HEADER, HEADER, VAR_HEADER, VAR_TYPES

# (values, unit, description)
ChannelData = tuple[np.ndarray, str, str]

_DTYPE_TO_VAR_TYPE = {dtype: code for code, dtype in VAR_TYPES.items() if code != 3}


def write_ibt(
    channels: Mapping[str, ChannelData],
    *,
    tick_rate: int = 60,
    session_info: str = "",
) -> bytes:
    if not channels:
        raise ValueError("at least one channel is required")
    lengths = {len(values) for values, _, _ in channels.values()}
    if len(lengths) != 1:
        raise ValueError(f"all channels must have the same length, got {sorted(lengths)}")
    n_records = lengths.pop()

    var_headers = np.zeros(len(channels), VAR_HEADER)
    names, formats, offsets = [], [], []
    offset = 0
    for i, (name, (values, unit, desc)) in enumerate(channels.items()):
        dtype = np.asarray(values).dtype.newbyteorder("<")
        if dtype not in _DTYPE_TO_VAR_TYPE:
            raise TypeError(f"channel {name!r}: unsupported dtype {dtype}")
        var_headers["type"][i] = _DTYPE_TO_VAR_TYPE[dtype]
        var_headers["offset"][i] = offset
        var_headers["count"][i] = 1
        var_headers["name"][i] = name.encode("latin-1")
        var_headers["desc"][i] = desc.encode("latin-1")
        var_headers["unit"][i] = unit.encode("latin-1")
        names.append(name)
        formats.append(dtype)
        offsets.append(offset)
        offset += dtype.itemsize
    buf_len = offset

    records = np.zeros(
        n_records, np.dtype({"names": names, "formats": formats, "offsets": offsets})
    )
    for name, (values, _, _) in channels.items():
        records[name] = values

    session_bytes = session_info.encode("latin-1") + b"\0"
    var_header_offset = HEADER.itemsize + DISK_HEADER.itemsize
    session_info_offset = var_header_offset + var_headers.nbytes
    data_offset = session_info_offset + len(session_bytes)

    header = np.zeros(1, HEADER)
    header["ver"] = 2
    header["status"] = 1
    header["tick_rate"] = tick_rate
    header["session_info_len"] = len(session_bytes)
    header["session_info_offset"] = session_info_offset
    header["num_vars"] = len(channels)
    header["var_header_offset"] = var_header_offset
    header["num_buf"] = 1
    header["buf_len"] = buf_len
    header["var_buf"]["tick_count"][0, 0] = n_records
    header["var_buf"]["buf_offset"][0, 0] = data_offset

    disk = np.zeros(1, DISK_HEADER)
    disk["record_count"] = n_records
    if "SessionTime" in channels and n_records:
        times = channels["SessionTime"][0]
        disk["start_time"] = times[0]
        disk["end_time"] = times[-1]

    return b"".join(
        [header.tobytes(), disk.tobytes(), var_headers.tobytes(), session_bytes, records.tobytes()]
    )
