"""Binary layout of iRacing ``.ibt`` telemetry files.

An .ibt file is the iRacing SDK's shared-memory layout written to disk:

    [header 112B][disk sub-header 32B][var headers N x 144B][session YAML][records ...]

Every offset in the header is absolute, so readers follow the offsets rather
than assuming the order above. All values are little-endian.
"""

from __future__ import annotations

import numpy as np

# irsdk_header
HEADER = np.dtype(
    [
        ("ver", "<i4"),
        ("status", "<i4"),
        ("tick_rate", "<i4"),
        ("session_info_update", "<i4"),
        ("session_info_len", "<i4"),
        ("session_info_offset", "<i4"),
        ("num_vars", "<i4"),
        ("var_header_offset", "<i4"),
        ("num_buf", "<i4"),
        ("buf_len", "<i4"),
        ("pad", "<i4", (2,)),
        (
            "var_buf",
            [("tick_count", "<i4"), ("buf_offset", "<i4"), ("pad", "<i4", (2,))],
            (4,),
        ),
    ]
)

# irsdk_diskSubHeader, immediately after the main header in .ibt files
DISK_HEADER = np.dtype(
    [
        ("start_date", "<i8"),  # time_t
        ("start_time", "<f8"),
        ("end_time", "<f8"),
        ("lap_count", "<i4"),
        ("record_count", "<i4"),
    ]
)

# irsdk_varHeader
VAR_HEADER = np.dtype(
    [
        ("type", "<i4"),
        ("offset", "<i4"),  # byte offset of the value within one record
        ("count", "<i4"),  # > 1 for array channels (e.g. per-car values)
        ("count_as_time", "u1"),
        ("pad", "u1", (3,)),
        ("name", "S32"),
        ("desc", "S64"),
        ("unit", "S32"),
    ]
)

# irsdk_VarType -> numpy dtype
VAR_TYPES: dict[int, np.dtype] = {
    0: np.dtype("S1"),  # char
    1: np.dtype("?"),  # bool
    2: np.dtype("<i4"),  # int
    3: np.dtype("<u4"),  # bitfield
    4: np.dtype("<f4"),  # float
    5: np.dtype("<f8"),  # double
}

assert HEADER.itemsize == 112
assert DISK_HEADER.itemsize == 32
assert VAR_HEADER.itemsize == 144
