"""Generate realistic .ibt sessions without needing iRacing.

Used by the demo endpoint and the test suite. The car is a classic
quasi-steady-state lap sim: lateral grip caps the speed in each corner, then
forward and backward passes apply the acceleration and braking limits. Each
lap is driven by a ``DriverProfile``, so different laps make mistakes in known
places, and tests can assert that the analyzer finds them.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .ibt import write_ibt

G = 9.81
V_MAX = 80.0  # m/s
LAT_GRIP = 1.55 * G
BRAKE_DECEL = 1.5 * G
DRIVE_ACCEL = 0.85 * G
GEAR_TOP_SPEEDS = np.array([24.0, 33.0, 42.0, 52.0, 63.0, 81.0])  # m/s at redline
REDLINE = 8500.0
WHEELBASE = 2.7
STEERING_RATIO = 12.0
ORIGIN_LAT, ORIGIN_LON = 47.0, 8.0
EARTH_M_PER_DEG = 111_320.0

# Corners of a fictional ~4 km circuit (metres). Corner cutting turns this into a smooth track.
LAYOUT = [
    (0, 0), (900, 0), (1050, 120), (1000, 350), (700, 420), (600, 600), (800, 800),
    (700, 1000), (300, 950), (150, 700), (250, 500), (0, 350), (-150, 150),
]  # fmt: skip


@dataclass(frozen=True)
class DriverProfile:
    grip: float = 1.0  # fraction of the car's lateral grip used
    braking: float = 1.0  # fraction of the car's braking capability used
    # (start_pct, end_pct, grip_factor): a section of the lap driven more slowly
    slow_zone: tuple[float, float, float] | None = None


@dataclass(frozen=True)
class Track:
    x: np.ndarray
    y: np.ndarray
    curvature: np.ndarray
    step: float

    @property
    def length(self) -> float:
        return len(self.x) * self.step


@dataclass(frozen=True)
class SyntheticSession:
    ibt: bytes
    track: Track
    lap_times: list[float]  # true lap times of laps 1..N


def _circular_smooth(a: np.ndarray, window: int) -> np.ndarray:
    padded = np.concatenate([a[-window:], a, a[:window]])
    return np.convolve(padded, np.ones(window) / window, mode="same")[window:-window]


def make_track(step: float = 1.0, start_offset: float = 300.0) -> Track:
    pts = np.array(LAYOUT, dtype=float)
    for _ in range(6):  # Chaikin corner cutting -> a smooth closed curve
        nxt = np.roll(pts, -1, axis=0)
        pts = np.column_stack([0.75 * pts + 0.25 * nxt, 0.25 * pts + 0.75 * nxt]).reshape(-1, 2)

    closed = np.vstack([pts, pts[:1]])
    seg = np.hypot(*np.diff(closed, axis=0).T)
    s = np.concatenate([[0.0], np.cumsum(seg)])
    grid = (np.arange(int(s[-1] / step)) * step + start_offset) % s[-1]
    x = np.interp(grid, s, closed[:, 0])
    y = np.interp(grid, s, closed[:, 1])

    dx = (np.roll(x, -1) - np.roll(x, 1)) / (2 * step)
    dy = (np.roll(y, -1) - np.roll(y, 1)) / (2 * step)
    ddx = (np.roll(x, -1) - 2 * x + np.roll(x, 1)) / step**2
    ddy = (np.roll(y, -1) - 2 * y + np.roll(y, 1)) / step**2
    curvature = (dx * ddy - dy * ddx) / np.power(dx * dx + dy * dy, 1.5)
    return Track(x, y, _circular_smooth(curvature, max(1, int(25 / step))), step)


def _drive_accel(v: np.ndarray | float) -> np.ndarray | float:
    return DRIVE_ACCEL * (1 - (np.asarray(v) / V_MAX) ** 2)


def drive_lap(track: Track, driver: DriverProfile) -> dict[str, np.ndarray]:
    """Speed and pedal traces for one flying lap, sampled every ``track.step`` metres."""
    n = len(track.curvature)
    grip = np.full(n, driver.grip)
    if driver.slow_zone:
        start, end, factor = driver.slow_zone
        pct = np.arange(n) / n
        grip[(pct >= start) & (pct < end)] *= factor
    v_lim = np.minimum(V_MAX, np.sqrt(LAT_GRIP * grip / np.maximum(np.abs(track.curvature), 1e-9)))

    # Three laps back to back so the middle one starts and ends at a settled speed.
    v = np.tile(v_lim, 3)
    ds, brake = track.step, BRAKE_DECEL * driver.braking
    for i in range(1, len(v)):
        v[i] = min(v[i], np.sqrt(v[i - 1] ** 2 + 2 * _drive_accel(v[i - 1]) * ds))
    for i in range(len(v) - 2, -1, -1):
        v[i] = min(v[i], np.sqrt(v[i + 1] ** 2 + 2 * brake * ds))
    v = v[n : 2 * n]

    accel = (np.roll(v, -1) ** 2 - np.roll(v, 1) ** 2) / (4 * ds)  # d(v^2/2)/ds
    braking = accel < -0.5
    at_limit = v >= v_lim - 0.3
    throttle = np.where(braking, 0.0, np.where(at_limit, 0.4, 1.0))
    brake_pedal = np.clip(-accel / BRAKE_DECEL, 0, 1) * braking
    steering = np.arctan(WHEELBASE * track.curvature) * STEERING_RATIO
    return {
        "speed": v,
        "throttle": _circular_smooth(throttle, 9),
        "brake": _circular_smooth(brake_pedal, 5),
        "steering": steering,
    }


def _session_yaml(track: Track) -> str:
    return (
        "WeekendInfo:\n"
        " TrackName: synthetic_ring\n"
        " TrackDisplayName: Synthetic Ring\n"
        " TrackConfigName: Grand Prix\n"
        f" TrackLength: {track.length / 1000:.2f} km\n"
        "DriverInfo:\n"
        " DriverCarIdx: 0\n"
        " Drivers:\n"
        " - CarIdx: 0\n"
        "   UserName: Demo Driver\n"
        "   CarScreenName: Generic GT3\n"
    )


def generate_session(
    profiles: tuple[DriverProfile, ...],
    *,
    track: Track | None = None,
    tick_rate: int = 60,
    out_lap_from: float = 0.7,
    in_lap_to: float = 0.3,
    session_start: float = 120.0,
) -> SyntheticSession:
    """A session with a partial out lap (lap 0), one full lap per profile, and a partial in lap."""
    track = track or make_track()
    n, L = len(track.curvature), track.length
    laps = [drive_lap(track, p) for p in profiles]

    # (lap number, sample indices, driven lap) for every piece of the session, in order
    pieces = [(0, np.arange(int(out_lap_from * n), n), laps[0])]
    pieces += [(i + 1, np.arange(n), lap) for i, lap in enumerate(laps)]
    pieces.append((len(laps) + 1, np.arange(int(in_lap_to * n)), laps[-1]))

    dist = np.concatenate([lap_no * L + idx * track.step for lap_no, idx, _ in pieces])
    chans = {
        key: np.concatenate([lap[key][idx] for _, idx, lap in pieces])
        for key in ("speed", "throttle", "brake", "steering")
    }
    xs = np.concatenate([track.x[idx] for _, idx, _ in pieces])
    ys = np.concatenate([track.y[idx] for _, idx, _ in pieces])

    v = chans["speed"]
    elapsed = np.concatenate([[0.0], np.cumsum(np.diff(dist) / ((v[1:] + v[:-1]) / 2))])
    crossings = np.interp(np.arange(1, len(laps) + 2) * L, dist, elapsed)
    lap_times = np.diff(crossings).tolist()

    t = np.arange(0.0, elapsed[-1], 1.0 / tick_rate)
    d = np.interp(t, elapsed, dist)
    lap_no = np.floor(d / L).astype(np.int32)
    lap_dist = d - lap_no * L
    speed = np.interp(d, dist, v)
    gear = np.clip(np.searchsorted(GEAR_TOP_SPEEDS, speed) + 1, 1, len(GEAR_TOP_SPEEDS))
    rpm = np.maximum(3000.0, REDLINE * speed / GEAR_TOP_SPEEDS[gear - 1])
    x, y = np.interp(d, dist, xs), np.interp(d, dist, ys)
    lat = ORIGIN_LAT + y / EARTH_M_PER_DEG
    lon = ORIGIN_LON + x / (EARTH_M_PER_DEG * np.cos(np.radians(ORIGIN_LAT)))
    on_pit_road = (lap_no == 0) & (lap_dist < (out_lap_from + 0.1) * L)

    f4, f8 = np.float32, np.float64
    channels = {
        "SessionTime": ((session_start + t).astype(f8), "s", "Seconds since session start"),
        "Lap": (lap_no, "", "Laps started count"),
        "LapDist": (lap_dist.astype(f4), "m", "Meters traveled from S/F this lap"),
        "LapDistPct": ((lap_dist / L).astype(f4), "%", "Percentage distance around lap"),
        "Speed": (speed.astype(f4), "m/s", "GPS vehicle speed"),
        "Throttle": (np.interp(d, dist, chans["throttle"]).astype(f4), "%", "Throttle"),
        "Brake": (np.interp(d, dist, chans["brake"]).astype(f4), "%", "Brake"),
        "Gear": (gear.astype(np.int32), "", "Gear"),
        "RPM": (rpm.astype(f4), "revs/min", "Engine rpm"),
        "SteeringWheelAngle": (
            np.interp(d, dist, chans["steering"]).astype(f4),
            "rad",
            "Steering wheel angle",
        ),
        "Lat": (lat.astype(f8), "deg", "Latitude"),
        "Lon": (lon.astype(f8), "deg", "Longitude"),
        "OnPitRoad": (on_pit_road, "", "Is the player car on pit road"),
    }
    data = write_ibt(channels, tick_rate=tick_rate, session_info=_session_yaml(track))
    return SyntheticSession(ibt=data, track=track, lap_times=lap_times)


# Lap 2 is the "hero" lap. Lap 3 brakes early everywhere and overslows one corner.
DEMO_PROFILES = (
    DriverProfile(grip=0.96, braking=0.85),
    DriverProfile(grip=1.0, braking=1.0),
    DriverProfile(grip=0.99, braking=0.8, slow_zone=(0.57, 0.65, 0.88)),
)


def demo_session() -> SyntheticSession:
    return generate_session(DEMO_PROFILES)
