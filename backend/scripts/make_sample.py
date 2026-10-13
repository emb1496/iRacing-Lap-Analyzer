"""Write synthetic .ibt files, e.g. to try the upload flow or fill a telemetry folder.

python scripts/make_sample.py samples/demo.ibt
python scripts/make_sample.py samples/gt3_ring.ibt --car "Porsche 911 GT3 R" --days-ago 3
"""

import argparse
import time
from pathlib import Path

from lap_analyzer.synthetic import DEMO_PROFILES, generate_session


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("out", nargs="?", default="demo.ibt", type=Path)
    ap.add_argument("--car", default="Generic GT3")
    ap.add_argument("--track", default="Synthetic Ring", help="track display name")
    ap.add_argument("--event", default="Practice", help="Practice, Qualify, Race, ...")
    ap.add_argument(
        "--days-ago", type=float, default=None, help="recording date; default: demo date"
    )
    args = ap.parse_args()

    kwargs = {}
    if args.days_ago is not None:
        kwargs["start_date"] = int(time.time() - args.days_ago * 86400)
    session = generate_session(
        DEMO_PROFILES, track_name=args.track, car=args.car, event_type=args.event, **kwargs
    )
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_bytes(session.ibt)
    times = ", ".join(f"{t:.3f}s" for t in session.lap_times)
    print(f"wrote {args.out} ({args.out.stat().st_size / 1e6:.1f} MB), lap times: {times}")


if __name__ == "__main__":
    main()
