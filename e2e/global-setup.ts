import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const python = process.env.PYTHON ?? "python";
const tmp = path.join(root, "e2e", ".tmp");

export const SAMPLE_IBT = path.join(tmp, "sample.ibt");

/** The telemetry folder the app under test is pointed at (IRACING_TELEMETRY_DIR). */
export const LIBRARY_DIR = path.join(tmp, "telemetry");

/** What the folder holds: two recordings that compare with each other, and one that cannot. */
export const LIBRARY_FILES = {
  a: "library-a.ibt",
  b: "library-b.ibt", // same track and car as a, windier
  elsewhere: "library-elsewhere.ibt", // a different track
} as const;

/** Variations on the demo session, written by backend/scripts/make_e2e_files.py. */
export const FILES = Object.fromEntries(
  [
    "bare", // required channels only: no pedals, gear, GPS, tyres or weather
    "windy",
    "no-pressure",
    "pit-lap", // lap 2 touches pit road
    "all-pit", // no valid lap at all
    "driving-errors", // lap 1 never brakes; lap 3 is late back to full throttle
    "no-tyres", // gear chart is the bottom chart
    "no-tyres-gear", // steering is
    "no-tyres-gear-steering", // brake is
    "one-tyre-missing",
    "no-track-temp",
    "no-weather",
    "no-wind",
    "odd-weather", // lap 1 has an unnamed wetness, lap 3 is wet
    "degenerate", // no corners, and a GPS trace that never moves
    "other-track",
  ].map((name) => [name, path.join(tmp, `${name}.ibt`)]),
) as Record<string, string>;

export default function globalSetup() {
  mkdirSync(tmp, { recursive: true });
  const backend = path.join(root, "backend");
  // A real .ibt on disk for the upload tests, and the odd variations the scenarios need.
  execFileSync(python, ["scripts/make_sample.py", SAMPLE_IBT], { cwd: backend, stdio: "inherit" });
  execFileSync(python, ["scripts/make_e2e_files.py", tmp], { cwd: backend, stdio: "inherit" });

  // Start from an empty folder every run, so a file a test left behind never lingers.
  rmSync(LIBRARY_DIR, { recursive: true, force: true });
  mkdirSync(LIBRARY_DIR, { recursive: true });
  copyFileSync(SAMPLE_IBT, path.join(LIBRARY_DIR, LIBRARY_FILES.a));
  copyFileSync(FILES["windy"], path.join(LIBRARY_DIR, LIBRARY_FILES.b));
  copyFileSync(FILES["other-track"], path.join(LIBRARY_DIR, LIBRARY_FILES.elsewhere));
}
