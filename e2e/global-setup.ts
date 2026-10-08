import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const python = process.env.PYTHON ?? "python";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

export const SAMPLE_IBT = path.join(root, "e2e", ".tmp", "sample.ibt");

export default function globalSetup() {
  // The backend serves frontend/dist, so make sure there is a build to serve.
  if (!existsSync(path.join(root, "frontend", "dist", "index.html"))) {
    execFileSync(npm, ["ci"], { cwd: path.join(root, "frontend"), stdio: "inherit" });
    execFileSync(npm, ["exec", "--", "vite", "build"], {
      cwd: path.join(root, "frontend"),
      stdio: "inherit",
    });
  }
  // A real .ibt on disk for the upload tests.
  mkdirSync(path.dirname(SAMPLE_IBT), { recursive: true });
  execFileSync(python, ["scripts/make_sample.py", SAMPLE_IBT], {
    cwd: path.join(root, "backend"),
    stdio: "inherit",
  });
}
