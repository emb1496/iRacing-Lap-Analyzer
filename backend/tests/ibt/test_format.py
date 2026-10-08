import numpy as np

from lap_analyzer.ibt.format import DISK_HEADER, HEADER, VAR_HEADER, VAR_TYPES


def test_struct_sizes_match_the_irsdk_layout():
    assert (HEADER.itemsize, DISK_HEADER.itemsize, VAR_HEADER.itemsize) == (112, 32, 144)


def test_var_types_cover_the_irsdk_types_little_endian():
    assert sorted(VAR_TYPES) == [0, 1, 2, 3, 4, 5]
    assert VAR_TYPES[2] == np.dtype("<i4")
    assert VAR_TYPES[5] == np.dtype("<f8")
