"""Write the demo session to an .ibt file, e.g. to try the upload flow.

python scripts/make_sample.py samples/demo.ibt
"""

import sys
from pathlib import Path

from lap_analyzer.synthetic import demo_session


def main() -> None:
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "demo.ibt")
    out.parent.mkdir(parents=True, exist_ok=True)
    session = demo_session()
    out.write_bytes(session.ibt)
    times = ", ".join(f"{t:.3f}s" for t in session.lap_times)
    print(f"wrote {out} ({out.stat().st_size / 1e6:.1f} MB), lap times: {times}")


if __name__ == "__main__":
    main()
