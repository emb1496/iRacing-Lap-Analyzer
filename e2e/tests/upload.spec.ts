import { expect, test } from "./fixtures";
import { SAMPLE_IBT } from "../global-setup";

test("uploading an .ibt file loads the session", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_IBT);

  await expect(page.getByText("sample.ibt")).toBeVisible();
  await expect(page.getByText(/Reference · Lap/)).toBeVisible();
  await expect(page.getByRole("img", { name: /track map/ })).toBeVisible();
});

test("uploading a non-ibt file shows a dismissible error", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "notes.ibt",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("definitely not telemetry"),
  });

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Could not read notes.ibt");
  await alert.getByRole("button", { name: "Dismiss" }).click();
  await expect(alert).toBeHidden();
  await expect(page.getByRole("heading", { name: "Where are you losing time?" })).toBeVisible();
});

test("loading two sessions compares across files", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo session" }).click();
  await expect(page.getByText("Reference · Lap 2")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_IBT);
  // Second file's best lap becomes the comparison, labelled with the driver.
  await expect(page.getByText(/Compared · .*, lap 2/)).toBeVisible();
});
