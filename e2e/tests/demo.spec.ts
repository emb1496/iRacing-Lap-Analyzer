import { expect, test } from "@playwright/test";

// Fail any test that logs a console error or throws in the page (the browser's automatic
// /favicon.ico request 404s because the app ships no favicon, so that one is ignored).
let errors: string[] = [];

test.beforeEach(async ({ page }) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.location().url.endsWith("/favicon.ico")) errors.push(m.text());
  });
  await page.goto("/");
});

test.afterEach(() => {
  expect(errors).toEqual([]);
});

test("demo session loads and shows a lap comparison", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Where are you losing time?" })).toBeVisible();
  await page.getByRole("button", { name: "Try the demo session" }).click();

  // Default selection: best lap (2) vs most recent other lap (3).
  await expect(page.getByText("Reference · Lap 2")).toBeVisible();
  await expect(page.getByText("Compared · Lap 3")).toBeVisible();
  await expect(page.getByText("Biggest loss")).toBeVisible();
  await expect(page.getByRole("img", { name: /Synthetic Ring track map/ })).toBeVisible();

  // Corner table is populated and charts rendered.
  await expect(page.locator(".corners tbody tr").first()).toBeVisible();
  expect(await page.locator(".corners tbody tr").count()).toBeGreaterThan(3);
  await expect(page.locator(".recharts-surface").first()).toBeVisible();
});

test("picking different laps updates the comparison", async ({ page }) => {
  await page.getByRole("button", { name: "Try the demo session" }).click();
  await expect(page.getByText("Reference · Lap 2")).toBeVisible();

  await page.getByRole("button", { name: "Use lap 1 as reference" }).click();
  await page.getByRole("button", { name: "Use lap 3 as comparison" }).click();
  await expect(page.getByText("Reference · Lap 1")).toBeVisible();
  await expect(page.getByText("Compared · Lap 3")).toBeVisible();
});

test("UI controls respond", async ({ page }) => {
  await page.getByRole("button", { name: "Try the demo session" }).click();
  await expect(page.getByText("Reference · Lap 2")).toBeVisible();

  const imperial = page.getByRole("button", { name: "mi · ft" });
  await imperial.click();
  await expect(imperial).toHaveAttribute("aria-pressed", "true");

  const line = page.getByRole("group", { name: "Map view" }).getByRole("button", { name: "Line" });
  await line.click();
  await expect(line).toHaveAttribute("aria-pressed", "true");

  // Zoom to the first corner via the corner table.
  await page.locator(".corners tbody tr").first().click();
  await expect(page.getByRole("group", { name: "Zoom to corner" })).toBeVisible();
});
