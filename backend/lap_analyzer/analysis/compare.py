"""Compare two laps: a time-delta trace, corner detection, and per-corner insights."""

from __future__ import annotations

from dataclasses import dataclass, replace

import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

from .laps import LapTrace

MS_TO_KMH = 3.6
BRAKE_ON = 0.1  # pedal fraction that counts as "on the brakes"
BRAKE_GAP_M = 15.0  # a brief release shorter than this is still one braking zone
FULL_THROTTLE = 0.95


@dataclass(frozen=True)
class Reason:
    """One contributing factor. ``value`` is signed and metric (m, km/h or %), so clients can
    localise units; its meaning per kind is documented on ``_reasons``."""

    kind: str  # brake_point | brake_new | brake_pressure | apex_speed | throttle_point
    value: float | None = None


@dataclass(frozen=True)
class Insight:
    even: bool  # time delta rounds to nothing at the 2dp the UI displays
    reasons: list[Reason]


@dataclass(frozen=True)
class Corner:
    number: int
    start: float  # metres; segments tile the whole lap, so corner deltas sum to the lap delta
    apex: float
    end: float
    time_delta: float  # + means the compared lap lost time here
    ref_min_speed: float  # km/h
    cmp_min_speed: float
    ref_brake: float | None  # metres where braking started, None if not braked
    cmp_brake: float | None
    ref_peak_brake: float  # peak brake pedal, %
    cmp_peak_brake: float
    ref_full_throttle: float | None  # metres where full throttle came back after the apex
    cmp_full_throttle: float | None
    insight: Insight


@dataclass(frozen=True)
class Comparison:
    distance: np.ndarray
    delta: np.ndarray  # cmp.time - ref.time at each distance
    ref: LapTrace
    cmp: LapTrace
    corners: list[Corner]


@dataclass(frozen=True)
class _Pedals:
    brake_start: float | None
    peak_brake: float
    full_throttle: float | None


def _smooth(a: np.ndarray, window: int) -> np.ndarray:
    if window <= 1:
        return a
    padded = np.pad(a, window, mode="edge")
    return np.convolve(padded, np.ones(window) / window, mode="same")[window:-window]


def detect_corners(
    distance: np.ndarray, speed_kmh: np.ndarray, *, window_m: float = 60.0, min_drop_kmh: float = 8
) -> list[int]:
    """Apex indices: local speed minima with a real braking zone before them."""
    step = float(distance[1] - distance[0])
    speed = _smooth(speed_kmh, max(1, int(20 / step)))
    w = max(1, int(window_m / step))
    window_min = sliding_window_view(np.pad(speed, w, mode="edge"), 2 * w + 1).min(axis=1)
    candidates = np.flatnonzero(speed <= window_min)

    apexes: list[int] = []
    for i in candidates:
        if apexes and i - apexes[-1] < w:  # plateau: keep the first index
            continue
        prev = apexes[-1] if apexes else 0
        if speed[prev : i + 1].max() - speed[i] >= min_drop_kmh:
            apexes.append(int(i))
    return apexes


def _brake_start(brake: np.ndarray, lo: int, apex: int, max_gap: int) -> int | None:
    """Index where the braking zone leading into ``apex`` began, searching no earlier than ``lo``.

    Walks back from the last braking sample before the apex, bridging releases
    shorter than ``max_gap`` samples (pedal wobble, a stab-release-stab).
    """
    hits = np.flatnonzero(brake[lo : apex + 1] > BRAKE_ON)
    if not hits.size:
        return None
    breaks = np.flatnonzero(np.diff(hits) > max_gap)
    return lo + int(hits[breaks[-1] + 1] if breaks.size else hits[0])


def _full_throttle(throttle: np.ndarray, apex: int, hi: int) -> int | None:
    hits = np.flatnonzero(throttle[apex : hi + 1] >= FULL_THROTTLE)
    return apex + int(hits[0]) if hits.size else None


def _explain(c: Corner) -> Insight:
    """Reasons the compared lap differs from the reference. Values are cmp relative to ref:

    brake_point: metres earlier (+) / later (-); brake_pressure: % points more (+) / less (-);
    apex_speed: km/h faster (+) / slower (-); throttle_point: metres later (+) / sooner (-).
    """
    if round(abs(c.time_delta), 2) < 0.02:  # match the 2dp the UI displays
        return Insight(even=True, reasons=[])
    reasons: list[Reason] = []
    if c.ref_brake is not None and c.cmp_brake is not None:
        diff = c.ref_brake - c.cmp_brake
        if abs(diff) >= 5:
            reasons.append(Reason("brake_point", diff))
        diff = c.cmp_peak_brake - c.ref_peak_brake
        if abs(diff) >= 8:
            reasons.append(Reason("brake_pressure", diff))
    elif c.cmp_brake is not None and c.ref_brake is None:
        reasons.append(Reason("brake_new"))
    speed_diff = c.cmp_min_speed - c.ref_min_speed
    if abs(speed_diff) >= 2:
        reasons.append(Reason("apex_speed", speed_diff))
    if c.ref_full_throttle is not None and c.cmp_full_throttle is not None:
        diff = c.cmp_full_throttle - c.ref_full_throttle
        if abs(diff) >= 10:
            reasons.append(Reason("throttle_point", diff))
    return Insight(even=False, reasons=reasons)


def compare_traces(ref: LapTrace, cmp: LapTrace, track_length: float) -> Comparison:
    if not np.array_equal(ref.pct, cmp.pct):
        raise ValueError("laps must be resampled onto the same grid")
    distance = ref.pct * track_length
    step = float(distance[1] - distance[0])
    delta = cmp.time - ref.time
    ref_speed = ref.channels["Speed"] * MS_TO_KMH
    cmp_speed = cmp.channels["Speed"] * MS_TO_KMH

    apexes = detect_corners(distance, ref_speed)
    if not apexes:  # a flat-out lap (e.g. an oval) has nothing to split into corners
        return Comparison(distance=distance, delta=delta, ref=ref, cmp=cmp, corners=[])
    # Split the lap where the *slower* of the two laps peaks between apexes. That is
    # where the first of the two drivers starts braking, so a lap that brakes early
    # has all of the resulting loss charged to the corner it was braking for.
    slower = np.minimum(ref_speed, cmp_speed)
    bounds = [0]
    for a, b in zip(apexes, apexes[1:], strict=False):
        bounds.append(a + int(np.argmax(slower[a : b + 1])))
    bounds.append(len(distance) - 1)

    def pedals(trace: LapTrace, lo: int, apex: int, hi: int) -> _Pedals:
        brake = trace.channels.get("Brake")
        throttle = trace.channels.get("Throttle")
        start = None
        peak = 0.0
        if brake is not None:
            start = _brake_start(brake, lo, apex, max(1, int(BRAKE_GAP_M / step)))
            if start is not None:
                peak = float(brake[start : apex + 1].max()) * 100
        full = _full_throttle(throttle, apex, hi) if throttle is not None else None
        return _Pedals(
            brake_start=float(distance[start]) if start is not None else None,
            peak_brake=peak,
            full_throttle=float(distance[full]) if full is not None else None,
        )

    corners = []
    for n, (apex, s, e) in enumerate(zip(apexes, bounds[:-1], bounds[1:], strict=True), start=1):
        cmp_apex = s + int(np.argmin(cmp_speed[s : e + 1]))
        lo = apexes[n - 2] if n > 1 else 0  # braking can begin before the segment boundary
        r, c = pedals(ref, lo, apex, e), pedals(cmp, lo, cmp_apex, e)
        corner = Corner(
            number=n,
            start=float(distance[s]),
            apex=float(distance[apex]),
            end=float(distance[e]),
            time_delta=float(delta[e] - delta[s]),
            ref_min_speed=float(ref_speed[apex]),
            cmp_min_speed=float(cmp_speed[cmp_apex]),
            ref_brake=r.brake_start,
            cmp_brake=c.brake_start,
            ref_peak_brake=r.peak_brake,
            cmp_peak_brake=c.peak_brake,
            ref_full_throttle=r.full_throttle,
            cmp_full_throttle=c.full_throttle,
            insight=Insight(even=True, reasons=[]),
        )
        corners.append(replace(corner, insight=_explain(corner)))
    return Comparison(distance=distance, delta=delta, ref=ref, cmp=cmp, corners=corners)
