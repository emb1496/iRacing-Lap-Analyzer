import { copyFileSync, rmSync } from "node:fs";
import path from "node:path";
import { type Page } from "@playwright/test";
import { LIBRARY_DIR, LIBRARY_FILES as F } from "../global-setup";
import { expect, test } from "./fixtures";

const rows = (page: Page) => page.locator("table.files tbody tr");
const pickButton = (page: Page, file: string, role: "reference" | "comparison") =>
  page.getByRole("button", { name: `Use ${file} as ${role}` });
const sameFile = (page: Page) => page.getByRole("checkbox", { name: "Use the same file for both" });
const changeFiles = (page: Page) => page.getByRole("button", { name: "Change files…" });
const pickerHeading = (page: Page) => page.getByRole("heading", { name: "Pick your laps" });

/** Answer the picker's folder lookup with something other than the real folder. */
const mockFolder = (page: Page, body: unknown, status = 200) =>
  page.route("**/api/files", (route) => route.fulfill({ status, json: body }));

const recording = (over: Record<string, unknown> = {}) => ({
  name: "made-up.ibt",
  size: 1024,
  modified: "2026-01-01T00:00:00Z",
  track: "Made-up Ring",
  car: "Made-up Car",
  driver: "Someone",
  recorded_at: "2026-01-01T00:00:00Z",
  session_type: "Practice",
  lap_count: 5,
  ...over,
});

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("the telemetry folder", () => {
  test("lists the recordings found on disk", async ({ page }) => {
    await expect(pickerHeading(page)).toBeVisible();
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).filter({ hasText: "Synthetic Ring" })).toHaveCount(2);
    await expect(rows(page).filter({ hasText: "Elsewhere Ring" })).toHaveCount(1);
  });

  test("filters by track, car or driver, and says when nothing matches", async ({ page }) => {
    const filter = page.getByRole("searchbox", { name: "Filter files" });
    await filter.fill("elsewhere");
    await expect(rows(page)).toHaveCount(1);

    await filter.fill("nothing like this");
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByText("No files match “nothing like this”.")).toBeVisible();

    await filter.fill("");
    await expect(rows(page)).toHaveCount(3);
  });

  test("rescan picks up a recording added while the app is open", async ({ page }) => {
    const late = path.join(LIBRARY_DIR, "library-late.ibt");
    await expect(rows(page)).toHaveCount(3); // the first look, before anything is added
    try {
      copyFileSync(path.join(LIBRARY_DIR, F.a), late);
      await expect(rows(page)).toHaveCount(3); // not looked at again until asked
      await page.getByRole("button", { name: "Rescan" }).click();
      await expect(rows(page)).toHaveCount(4);
    } finally {
      rmSync(late, { force: true });
    }
  });

  test("shows a hint while it is still looking", async ({ page }) => {
    await page.route("**/api/files", async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.continue();
    });
    await page.reload();
    await expect(page.getByText("Looking for your telemetry files…")).toBeVisible();
    await expect(rows(page)).toHaveCount(3);
  });

  test("explains a missing folder, and a failed lookup reads the same", async ({ page }) => {
    await mockFolder(page, { directory: null, files: [] });
    await page.reload();
    await expect(page.getByText(/Couldn't find your iRacing telemetry folder/)).toBeVisible();

    await page.unroute("**/api/files");
    await mockFolder(page, { detail: "boom" }, 500);
    await page.getByRole("button", { name: "Rescan" }).click();
    await expect(page.getByText(/Couldn't find your iRacing telemetry folder/)).toBeVisible();
    await expect(page.getByRole("button", { name: "try the demo session" })).toBeVisible();
  });

  test("explains an empty folder", async ({ page }) => {
    await mockFolder(page, { directory: "C:\\iRacing\\telemetry", files: [] });
    await page.reload();
    await expect(page.getByText(/No .ibt files in/)).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
  });

  test("lists a recording even when the file did not say much about itself", async ({ page }) => {
    await mockFolder(page, {
      directory: "C:\\iRacing\\telemetry",
      files: [recording({ recorded_at: "not a date", session_type: null, lap_count: null })],
    });
    await page.reload();
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText("Made-up Ring");
  });
});

test.describe("choosing files from the folder", () => {
  test("one file serves as both laps by default", async ({ page }) => {
    for (const file of [F.a, F.b]) {
      await expect(pickButton(page, file, "comparison")).toBeDisabled();
    }
    await pickButton(page, F.a, "reference").click();
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
    await expect(page.getByText(/Compared · Lap/)).toBeVisible();
    await expect(page.getByText(F.a)).toBeVisible();
    await expect(pickerHeading(page)).toBeHidden();
  });

  test("'Change files…' goes back to the picker, showing what is chosen", async ({ page }) => {
    await pickButton(page, F.a, "reference").click();
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();

    await changeFiles(page).click();
    await expect(pickerHeading(page)).toBeVisible();
    await expect(pickButton(page, F.a, "reference")).toHaveClass(/\bon\b/);
    await expect(pickButton(page, F.b, "reference")).not.toHaveClass(/\bon\b/);
  });

  test("a different file can be the comparison; the same file again reuses what is loaded", async ({ page }) => {
    await pickButton(page, F.a, "reference").click();
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();

    await changeFiles(page).click();
    await sameFile(page).uncheck();
    await pickButton(page, F.b, "comparison").click();
    await expect(page.getByText(/Compared · .*lap/)).toBeVisible();
    await expect(page.locator("section.session")).toHaveCount(2);

    // Picking the reference's own file for the comparison switches to another lap of it.
    await changeFiles(page).click();
    await pickButton(page, F.a, "comparison").click();
    await expect(page.getByText(/Compared · Lap/)).toBeVisible();
    await expect(page.locator("section.session")).toHaveCount(2); // nothing was loaded again
  });

  test("ticking 'same file' again puts the comparison back on the reference's file", async ({ page }) => {
    await pickButton(page, F.a, "reference").click();
    await changeFiles(page).click();
    await sameFile(page).uncheck();
    await pickButton(page, F.b, "comparison").click();
    await expect(page.getByText(/Compared · .*lap/)).toBeVisible();

    await changeFiles(page).click();
    await sameFile(page).check();
    await expect(page.getByText(/Compared · Lap/)).toBeVisible();
  });

  test("a recording from another track cannot be the comparison", async ({ page }) => {
    await pickButton(page, F.a, "reference").click();
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
    await changeFiles(page).click();
    await sameFile(page).uncheck();

    const blocked = pickButton(page, F.elsewhere, "comparison");
    await expect(blocked).toBeDisabled();
    await expect(blocked).toHaveAttribute("title", /Different track or car/);
    await expect(pickButton(page, F.b, "comparison")).toBeEnabled();
  });

  test("a new reference keeps a comparison it still fits and drops one it does not", async ({ page }) => {
    await pickButton(page, F.a, "reference").click();
    await changeFiles(page).click();
    await sameFile(page).uncheck();
    await pickButton(page, F.b, "comparison").click();
    await expect(page.getByText(/Compared · .*lap/)).toBeVisible();

    // Same track and car: the comparison from file b stays.
    await changeFiles(page).click();
    await pickButton(page, F.b, "reference").click();
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();

    // Another track: the comparison no longer fits, so the picker stays up for a new one.
    await changeFiles(page).click();
    await pickButton(page, F.elsewhere, "reference").click();
    await expect(pickerHeading(page)).toBeVisible();
    await expect(page.getByText(/Compared ·/)).toHaveCount(0);
    await expect(pickButton(page, F.a, "comparison")).toBeDisabled();
  });

  test("a recording that cannot be loaded shows why, and can be dismissed", async ({ page }) => {
    await page.route("**/api/sessions/from-library", (route) =>
      route.fulfill({ status: 404, json: { detail: `${F.a} not found in the telemetry folder` } }),
    );
    await pickButton(page, F.a, "reference").click();
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("not found in the telemetry folder");
    await alert.getByRole("button", { name: "Dismiss" }).click();
    await expect(alert).toBeHidden();
    await expect(pickerHeading(page)).toBeVisible();
  });

  test("the demo can still be started from the picker", async ({ page }) => {
    await page.getByRole("button", { name: "try the demo session" }).click();
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
  });
});
