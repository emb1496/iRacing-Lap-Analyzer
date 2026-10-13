"""Write the telemetry files the browser tests upload, each a variation on the demo session.

python scripts/make_e2e_files.py e2e/.tmp
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # for tests_integration

from lap_analyzer.ibt import IbtFile  # noqa: E402
from lap_analyzer.synthetic import demo_session  # noqa: E402
from tests_integration.builders import rebuild  # noqa: E402

TYRE_PREFIXES = ("LF", "RF", "LR", "RR")


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    out.mkdir(parents=True, exist_ok=True)
    demo = demo_session().ibt
    ibt = IbtFile.from_bytes(demo)
    names = list(ibt.channels)

    def lap_edit(data: bytes, channel: str, lap: int, edit) -> bytes:
        values = IbtFile.from_bytes(data)[channel].copy()
        mask = IbtFile.from_bytes(data)["Lap"] == lap
        values[mask] = edit(values[mask])
        return rebuild(data, replace={channel: values})

    tyre = tuple(n for n in names if n.startswith(TYRE_PREFIXES))
    weather = ("TrackTempCrew", "AirTemp", "TrackWetness", "WindVel", "RelativeHumidity")
    n_samples = len(ibt)
    files = {
        # The required channels and nothing else: no pedals, gear, GPS, tyres or weather.
        "bare.ibt": rebuild(
            demo,
            drop=(
                "Throttle",
                "Brake",
                "Gear",
                "RPM",
                "SteeringWheelAngle",
                "Lat",
                "Lon",
                "TrackTempCrew",
                "AirTemp",
                "TrackWetness",
                "WindVel",
                "RelativeHumidity",
                *tyre,
            ),
        ),  # fmt: skip
        "windy.ibt": rebuild(demo, replace={"WindVel": ibt["WindVel"] + np.float32(10.0)}),
        "no-pressure.ibt": rebuild(demo, drop=tuple(n for n in tyre if n.endswith("pressure"))),
        # Lap 2 touches pit road, so it is flagged invalid.
        "pit-lap.ibt": rebuild(
            demo,
            replace={
                "OnPitRoad": (
                    (ibt["Lap"] == 2) & (ibt["LapDistPct"] > 0.5) & (ibt["LapDistPct"] < 0.55)
                )
            },
        ),
        # Lap 1 never brakes; lap 3 gets back to full throttle much later than lap 2.
        "driving-errors.ibt": lap_edit(
            lap_edit(demo, "Brake", 1, np.zeros_like), "Throttle", 3, lambda t: np.roll(t, 150)
        ),
        # Every lap touches pit road, so no lap is valid and there is no "best" lap.
        "all-pit.ibt": rebuild(demo, replace={"OnPitRoad": np.ones(len(ibt), dtype=bool)}),
        # What is logged decides which chart sits at the bottom, with the distance axis.
        "no-tyres.ibt": rebuild(demo, drop=tyre),
        "no-tyres-gear.ibt": rebuild(demo, drop=(*tyre, "Gear")),
        "no-tyres-gear-steering.ibt": rebuild(demo, drop=(*tyre, "Gear", "SteeringWheelAngle")),
        "one-tyre-missing.ibt": rebuild(demo, drop=tuple(n for n in tyre if n.startswith("LF"))),
        "no-track-temp.ibt": rebuild(demo, drop=("TrackTempCrew",)),
        "no-wind.ibt": rebuild(demo, drop=("WindVel",)),
        "no-weather.ibt": rebuild(demo, drop=weather),
        # Lap 1 has a wetness value the app has no name for; lap 3 is wet.
        "odd-weather.ibt": lap_edit(
            lap_edit(demo, "TrackWetness", 1, lambda w: np.full_like(w, 9)),
            "TrackWetness",
            3,
            lambda w: np.full_like(w, 5),
        ),
        # No corners to find and a GPS trace that never moves.
        "degenerate.ibt": rebuild(
            demo,
            replace={
                "Speed": np.full(n_samples, 40.0, np.float32),
                "Lat": np.full(n_samples, 52.0),
                "Lon": np.full(n_samples, -1.0),
            },
        ),
        "other-track.ibt": demo.replace(b"Synthetic Ring", b"Elsewhere Ring"),
    }
    for name, data in files.items():
        (out / name).write_bytes(data)
        print(f"wrote {out / name} ({len(data) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
