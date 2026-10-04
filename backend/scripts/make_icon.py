"""Render docs/logo.svg's artwork to docs/logo.ico (Windows app icon). Needs Pillow.

Run from the repo root: python backend/scripts/make_icon.py
The geometry mirrors docs/logo.svg; update both together.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
S = 16  # supersample factor over the 128-unit viewBox
SIZE = 128 * S

# (start, control, end) quadratic curves and (start, end) lines, in viewBox units
SEGMENTS = [
    ("L", (26, 88), (26, 52)),
    ("Q", (26, 52), (26, 36), (42, 36)),
    ("L", (42, 36), (70, 36)),
    ("Q", (70, 36), (82, 36), (86, 46)),
    ("Q", (86, 46), (90, 56), (100, 56)),
    ("Q", (100, 56), (106, 56), (106, 64)),
    ("L", (106, 64), (106, 82)),
    ("Q", (106, 82), (106, 92), (96, 92)),
    ("L", (96, 92), (40, 92)),
    ("Q", (40, 92), (26, 92), (26, 88)),
]


def sample_path() -> list[tuple[float, float]]:
    pts: list[tuple[float, float]] = [SEGMENTS[0][1]]
    for seg in SEGMENTS:
        if seg[0] == "L":
            pts.append(seg[2])
        else:
            (x0, y0), (cx, cy), (x1, y1) = seg[1:]
            for i in range(1, 41):
                t = i / 40
                u = 1 - t
                pts.append(
                    (
                        u * u * x0 + 2 * u * t * cx + t * t * x1,
                        u * u * y0 + 2 * u * t * cy + t * t * y1,
                    )
                )
    return pts


def stroke(draw: ImageDraw.ImageDraw, pts, width: float, color: str) -> None:
    w = width * S
    r = w / 2
    px = [(x * S, y * S) for x, y in pts]
    draw.line(px, fill=color, width=round(w))
    for x, y in px:
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)


def slice_by_length(pts, start: float, end: float):
    out, run = [], 0.0
    for a, b in zip(pts, pts[1:], strict=False):
        d = math.dist(a, b)
        if run + d >= start and run <= end:
            out.append(b)
        run += d
    return out


def render() -> Image.Image:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=28 * S, fill="#12141a")
    pts = sample_path()
    stroke(d, pts, 14, "#2a2f3a")
    stroke(d, slice_by_length(pts, 0, 150), 5, "#34d399")
    stroke(d, slice_by_length(pts, 150, 280), 5, "#f87171")
    d.rectangle([21 * S, 60 * S, 31 * S, 64 * S], fill="#ffffff")
    d.rectangle([21 * S, 64 * S, 31 * S, 68 * S], fill="#12141a", outline="#ffffff", width=S)
    return img


if __name__ == "__main__":
    big = render().resize((256, 256), Image.LANCZOS)
    out = ROOT / "docs" / "logo.ico"
    big.save(out, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print("wrote", out)
