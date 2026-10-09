import { defineConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "frontend");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

// FastAPI mounts frontend/dist when it *starts*, and Playwright starts the webServer before
// globalSetup runs, so the build has to exist before the config finishes loading.
if (!existsSync(path.join(frontend, "dist", "index.html"))) {
  execFileSync(npm, ["ci"], { cwd: frontend, stdio: "inherit" });
  execFileSync(npm, ["exec", "--", "vite", "build"], { cwd: frontend, stdio: "inherit" });
}

const PORT = 8765;
const python = process.env.PYTHON ?? "python";

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  workers: 1, // one shared server with an in-memory session store
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },
  // Launches the real app: FastAPI serving the built frontend from frontend/dist.
  webServer: {
    command: `${python} -m uvicorn lap_analyzer.main:app --host 127.0.0.1 --port ${PORT} --log-level warning`,
    cwd: "../backend",
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
