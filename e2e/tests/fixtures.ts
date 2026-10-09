import { test as base, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const COVERAGE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".tmp",
  "coverage",
);

// With E2E_COVERAGE=1 the served bundle is Istanbul-instrumented and keeps its counters on
// window.__coverage__. Dump them after each test so `nyc report` can merge them.
export const test = base.extend<{ collectCoverage: void }>({
  collectCoverage: [
    async ({ page }, use, testInfo) => {
      await use();
      if (process.env.E2E_COVERAGE !== "1") return;
      const data = await page.evaluate(() => (window as { __coverage__?: unknown }).__coverage__);
      if (!data) return;
      mkdirSync(COVERAGE_DIR, { recursive: true });
      writeFileSync(path.join(COVERAGE_DIR, `${testInfo.testId}-${testInfo.retry}.json`), JSON.stringify(data));
    },
    { auto: true },
  ],
});

export { expect };
