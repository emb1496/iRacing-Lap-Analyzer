import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const python = process.env.PYTHON ?? "python";

export const SAMPLE_IBT = path.join(root, "e2e", ".tmp", "sample.ibt");

export default function globalSetup() {
  // A real .ibt on disk for the upload tests.
  mkdirSync(path.dirname(SAMPLE_IBT), { recursive: true });
  execFileSync(python, ["scripts/make_sample.py", SAMPLE_IBT], {
    cwd: path.join(root, "backend"),
    stdio: "inherit",
  });
}
