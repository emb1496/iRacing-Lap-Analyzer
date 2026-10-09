import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const python = process.env.PYTHON ?? "python";
const tmp = path.join(root, "e2e", ".tmp");

export const SAMPLE_IBT = path.join(tmp, "sample.ibt");

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
}
