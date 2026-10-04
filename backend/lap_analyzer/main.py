"""HTTP API. Run with: uvicorn lap_analyzer.main:app --reload"""

from __future__ import annotations

import sys
from dataclasses import asdict
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from lap_analyzer.models.comparison_out import ComparisonOut
from lap_analyzer.models.lap_ref import LapRef
from lap_analyzer.models.lap_summary import LapSummary
from lap_analyzer.models.session_summary import SessionSummary
from lap_analyzer.models.trace import Trace

from . import __version__
from .analysis import LapTrace, compare_traces
from .ibt import IbtFile, IbtFormatError
from .session import Session, SessionStore
from .synthetic import demo_session

MAX_UPLOAD_BYTES = 512 * 1024 * 1024

app = FastAPI(title="Lap Analyzer", version=__version__)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
store = SessionStore()


def _summary(s: Session) -> SessionSummary:
    best = s.best_lap
    return SessionSummary(
        id=s.id,
        filename=s.filename,
        track=s.track,
        car=s.car,
        driver=s.driver,
        track_length=round(s.track_length, 1),
        best_lap=best.number if best else None,
        laps=[
            LapSummary(number=lap.number, time=lap.time, valid=lap.valid)
            for lap in s.laps
            if lap.complete
        ],
    )


def _load(data: bytes, filename: str) -> SessionSummary:
    try:
        session = Session(IbtFile.from_bytes(data), filename)
    except (IbtFormatError, ValueError) as exc:
        raise HTTPException(422, f"Could not read {filename}: {exc}") from exc
    return _summary(store.add(session))


def _get_session(session_id: str) -> Session:
    try:
        return store.get(session_id)
    except KeyError:
        raise HTTPException(404, f"session {session_id} not found") from None


def _rounded(a: np.ndarray, decimals: int) -> list[float]:
    return np.round(a, decimals).tolist()


def _trace_out(trace: LapTrace) -> Trace:
    ch = trace.channels

    def opt(name: str, scale: float = 1.0, decimals: int = 2) -> list[float] | None:
        return _rounded(ch[name] * scale, decimals) if name in ch else None

    return Trace(
        time=_rounded(trace.time, 4),
        speed=_rounded(ch["Speed"] * 3.6, 1),
        throttle=opt("Throttle", 100, 1),
        brake=opt("Brake", 100, 1),
        gear=ch["Gear"].astype(int).tolist() if "Gear" in ch else None,
        rpm=opt("RPM", 1, 0),
        steering=opt("SteeringWheelAngle", 1, 3),
        lat=opt("Lat", 1, 7),
        lon=opt("Lon", 1, 7),
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@app.post("/api/sessions", response_model=SessionSummary)
async def upload_session(file: UploadFile) -> SessionSummary:
    filename = file.filename or "upload.ibt"
    if not filename.lower().endswith(".ibt"):
        raise HTTPException(400, "expected an iRacing .ibt telemetry file")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "file too large")
    return _load(data, filename)


@app.post("/api/sessions/demo", response_model=SessionSummary)
def load_demo() -> SessionSummary:
    return _load(demo_session().ibt, "demo-synthetic-ring.ibt")


@app.get("/api/sessions", response_model=list[SessionSummary])
def list_sessions() -> list[SessionSummary]:
    return [_summary(s) for s in store.all()]


@app.get("/api/compare", response_model=ComparisonOut)
def compare(
    ref_session: str,
    ref_lap: int,
    cmp_session: str,
    cmp_lap: int,
    step: float = Query(2.0, ge=0.5, le=20, description="Distance resolution in metres"),
) -> ComparisonOut:
    ref_s, cmp_s = _get_session(ref_session), _get_session(cmp_session)
    if ref_s.track != cmp_s.track:
        raise HTTPException(400, f"laps are from different tracks ({ref_s.track} / {cmp_s.track})")

    grid = np.linspace(0.0, 1.0, max(100, int(ref_s.track_length / step)) + 1)
    try:
        ref, cmp_ = ref_s.trace(ref_lap, grid), cmp_s.trace(cmp_lap, grid)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from None
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from None

    result = compare_traces(ref, cmp_, ref_s.track_length)

    def lap_ref(s: Session, n: int) -> LapRef:
        lap = s.lap(n)
        label = f"Lap {n}" if ref_s is cmp_s else f"{s.driver}, lap {n}"
        return LapRef(session_id=s.id, lap=n, lap_time=lap.time or 0.0, label=label)

    return ComparisonOut(
        track=ref_s.track,
        track_length=ref_s.track_length,
        ref=lap_ref(ref_s, ref_lap),
        cmp=lap_ref(cmp_s, cmp_lap),
        distance=_rounded(result.distance, 1),
        delta=_rounded(result.delta, 4),
        ref_trace=_trace_out(result.ref),
        cmp_trace=_trace_out(result.cmp),
        corners=[asdict(c) for c in result.corners],
    )


def _frontend_dir() -> Path | None:
    """Built frontend: bundled by PyInstaller, or ../frontend/dist in a checkout."""
    if getattr(sys, "frozen", False):
        candidate = Path(sys._MEIPASS) / "frontend_dist"  # type: ignore[attr-defined]
    else:
        candidate = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    return candidate if (candidate / "index.html").is_file() else None


# Registered last so it never shadows the /api routes.
if (_dist := _frontend_dir()) is not None:
    app.mount("/", StaticFiles(directory=_dist, html=True), name="frontend")
