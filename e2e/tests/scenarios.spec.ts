import { readFileSync } from "node:fs";
import { type Page } from "@playwright/test";
import { FILES, SAMPLE_IBT } from "../global-setup";
import { expect, test } from "./fixtures";

const fileInput = (page: Page) => page.locator('input[type="file"]');
const session = (page: Page, n: number) => page.locator("section.session").nth(n);
const speedChart = (page: Page) => page.locator(".charts .recharts-wrapper").nth(1);

/** The speed chart's box in viewport coordinates, scrolled into view so the mouse can reach it. */
async function speedChartBox(page: Page) {
  await speedChart(page).scrollIntoViewIfNeeded();
  return (await speedChart(page).boundingBox())!;
}

async function loadDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo session" }).click();
  await expect(page.getByText("Reference · Lap 2")).toBeVisible();
}

async function upload(page: Page, file: string) {
  const before = await page.locator("section.session").count();
  await fileInput(page).setInputFiles(file);
  await expect(page.locator("section.session")).toHaveCount(before + 1);
}

/** Press, drag and release the mouse over a chart, as fractions of its width. */
async function dragAcross(page: Page, from: number, to: number, releaseAt?: { x: number; y: number }) {
  const box = await speedChartBox(page);
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * from, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * ((from + to) / 2), y, { steps: 5 });
  await page.mouse.move(box.x + box.width * to, y, { steps: 5 });
  if (releaseAt) await page.mouse.move(releaseAt.x, releaseAt.y, { steps: 3 });
  await page.mouse.up();
}

test.describe("loading files", () => {
  test("the upload button opens the file picker", async ({ page }) => {
    await page.goto("/");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload .ibt" }).click();
    await (await chooser).setFiles(SAMPLE_IBT);
    await expect(page.getByText("sample.ibt")).toBeVisible();
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
  });

  test("dropping a file on the session panel loads it", async ({ page }) => {
    await page.goto("/");
    const panel = page.locator("aside.sessions");
    const empty = await page.evaluateHandle(() => new DataTransfer());
    await panel.dispatchEvent("dragover", { dataTransfer: empty });
    await expect(panel).toHaveClass(/dragging/);
    await panel.dispatchEvent("dragleave", { dataTransfer: empty });
    await expect(panel).not.toHaveClass(/dragging/);

    // Dropping nothing does nothing.
    await panel.dispatchEvent("drop", { dataTransfer: empty });
    await expect(page.getByRole("alert")).toBeHidden();

    const bytes = [...readFileSync(SAMPLE_IBT)];
    const withFile = await page.evaluateHandle((data) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(data)], "dropped.ibt"));
      return dt;
    }, bytes);
    await panel.dispatchEvent("drop", { dataTransfer: withFile });
    await expect(page.getByText("dropped.ibt")).toBeVisible();
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
  });

  test("a file from another track cannot be compared, and the error can be dismissed", async ({ page }) => {
    await loadDemo(page);
    await fileInput(page).setInputFiles(FILES["other-track"]);
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("laps are from different tracks");
    await alert.getByRole("button", { name: "Dismiss" }).click();
    await expect(alert).toBeHidden();
  });

  test("a session with no valid lap still lets you pick laps by hand", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["all-pit"]);
    await expect(page.getByText("all-pit.ibt")).toBeVisible();
    await expect(page.locator(".badge.muted")).toHaveCount(3); // every lap is flagged "pit"
    await expect(page.getByText(/Reference · Lap/)).toBeHidden();

    await page.getByRole("button", { name: "Use lap 1 as reference" }).click();
    await page.getByRole("button", { name: "Use lap 2 as comparison" }).click();
    await expect(page.getByText("Reference · Lap 1")).toBeVisible();

    // A second file with no best lap leaves the comparison as it is.
    await fileInput(page).setInputFiles(FILES["all-pit"]);
    await expect(page.locator("section.session")).toHaveCount(2);
    await expect(page.getByText("Reference · Lap 1")).toBeVisible();
    await expect(page.getByText("Compared · Lap 2")).toBeVisible();
  });

  test("a lap that touched pit road is marked", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["pit-lap"]);
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
    await expect(session(page, 0).locator("tr.invalid")).toHaveCount(1);
    await expect(session(page, 0).locator("tr.invalid .badge")).toHaveText("pit");
  });
});

test.describe("zooming the charts", () => {
  test.beforeEach(async ({ page }) => loadDemo(page));

  test("dragging across a chart zooms, and the zoom can be reset", async ({ page }) => {
    await expect(page.getByText("Drag on any chart to zoom")).toBeVisible();
    await dragAcross(page, 0.3, 0.6);
    await expect(page.getByText(/^Showing /)).toBeVisible();
    await page.getByRole("button", { name: "Reset zoom" }).click();
    await expect(page.getByText("Drag on any chart to zoom")).toBeVisible();
  });

  test("a drag released outside the charts still ends, and double click zooms out", async ({ page }) => {
    await dragAcross(page, 0.2, 0.7, { x: 2, y: 2 });
    await expect(page.getByText(/^Showing /)).toBeVisible();
    await page.locator(".charts").dblclick({ position: { x: 100, y: 100 } });
    await expect(page.getByText("Drag on any chart to zoom")).toBeVisible();
  });

  test("a click without dragging does not zoom", async ({ page }) => {
    const box = await speedChartBox(page);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByText("Drag on any chart to zoom")).toBeVisible();
  });

  test("corner chips toggle a zoom onto that corner", async ({ page }) => {
    const chip = page.getByRole("group", { name: "Zoom to corner" }).getByRole("button", { name: "T2" });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Drag on any chart to zoom")).toBeVisible();
  });

  test("hovering a chart moves a marker on the track map", async ({ page }) => {
    const box = await speedChartBox(page);
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2, { steps: 4 });
    await expect(page.locator(".hover-dot")).toBeVisible();
    await page.mouse.move(2, 2);
    await expect(page.locator(".hover-dot")).toBeHidden();
  });

  test("hovering a corner row marks its apex on the map", async ({ page }) => {
    await page.locator(".corners tbody tr").nth(1).hover();
    await expect(page.locator(".hover-dot")).toBeVisible();
    await page.mouse.move(2, 2);
    await expect(page.locator(".hover-dot")).toBeHidden();
  });

  test("the tyre chart can show any logged tyre", async ({ page }) => {
    const tyres = page.getByRole("group", { name: "Tyre" });
    await tyres.getByRole("button", { name: "LR" }).click();
    await expect(tyres.getByRole("button", { name: "LR" })).toHaveAttribute("aria-pressed", "true");
    await expect(tyres.getByRole("button", { name: "RF" })).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("track map", () => {
  test("line view overlays both laps, follows the zoom and the cursor, and switches back", async ({ page }) => {
    await loadDemo(page);
    const view = page.getByRole("group", { name: "Map view" });
    await view.getByRole("button", { name: "Line" }).click();
    await expect(view.getByRole("button", { name: "Line" })).toHaveAttribute("aria-pressed", "true");

    await page.locator(".corners tbody tr").nth(2).click(); // zoom to a corner
    await page.locator(".corners tbody tr").nth(1).hover();
    await expect(page.locator("svg[role=img] circle")).not.toHaveCount(1); // hover dots for both laps

    await view.getByRole("button", { name: "Delta" }).click();
    await expect(view.getByRole("button", { name: "Delta" })).toHaveAttribute("aria-pressed", "true");
  });

  test("a file without GPS has no map", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["bare"]);
    await expect(page.getByText("No GPS channels in this file.")).toBeVisible();
  });

  test("line view is unavailable when the compared lap has no GPS", async ({ page }) => {
    await loadDemo(page);
    await upload(page, FILES["bare"]); // its best lap becomes the comparison
    await expect(page.getByText(/Compared · .*lap 2/)).toBeVisible();
    await expect(page.getByRole("group", { name: "Map view" }).getByRole("button", { name: "Line" })).toBeDisabled();
  });
});

test.describe("telemetry that is not there", () => {
  test("a file with only the required channels shows just speed and delta", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["bare"]);
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Speed/ })).toBeVisible();
    for (const missing of ["Throttle", "Brake", "Steering", "Gear", "Tyre temperature"]) {
      await expect(page.getByRole("heading", { name: new RegExp(missing) })).toHaveCount(0);
    }
    await expect(page.locator(".conditions")).toHaveCount(0);
    await dragAcross(page, 0.3, 0.6); // the zoom still works with a single chart
    await expect(page.getByText(/^Showing /)).toBeVisible();
  });

  test("conditions that only one lap logged are left out", async ({ page }) => {
    await loadDemo(page);
    await upload(page, FILES["bare"]);
    await expect(page.getByText(/Compared · .*lap 2/)).toBeVisible();
    await expect(page.locator(".conditions")).toHaveCount(0);
  });

  test("tyre pressure is shown only when both laps logged it", async ({ page }) => {
    await loadDemo(page);
    await expect(page.locator(".tyre p").first()).toContainText(/kPa|psi/);
    await upload(page, FILES["no-pressure"]);
    await expect(page.getByText(/Compared · .*lap 2/)).toBeVisible();
    await expect(page.locator(".tyre")).toHaveCount(4);
    await expect(page.locator(".tyre p").first()).not.toContainText(/kPa|psi/);
  });
});

test.describe("the layout adapts to what was logged", () => {
  for (const [file, bottom] of [
    ["no-tyres", "Gear"],
    ["no-tyres-gear", "Steering"],
    ["no-tyres-gear-steering", "Brake"],
  ] as const) {
    test(`without ${file.replaceAll("-", " ")}, the ${bottom} chart carries the distance axis`, async ({ page }) => {
      await page.goto("/");
      await fileInput(page).setInputFiles(FILES[file]);
      await expect(page.getByText(/Reference · Lap/)).toBeVisible();
      await expect(page.getByRole("heading", { name: new RegExp(bottom) })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Tyre temperature/ })).toHaveCount(0);
      await expect(page.locator(".charts .recharts-xAxis")).toHaveCount(1);
    });
  }

  test("a tyre that is missing on one side leaves a gap in the grid", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["one-tyre-missing"]);
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
    await expect(page.locator(".tyre")).toHaveCount(3);
    await expect(page.getByRole("group", { name: "Tyre" }).getByRole("button")).toHaveCount(3);
  });

  test("a file with no weather has no conditions panel at all", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["no-weather"]);
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
    await expect(page.locator(".conditions")).toHaveCount(1); // the tyres are still there
    await expect(page.getByText("Track temp")).toHaveCount(0);
  });

  test("a track with nothing to brake for has no corners", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["degenerate"]);
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
    await expect(page.locator(".corners tbody tr")).toHaveCount(0);
    await expect(page.getByRole("img", { name: /track map/ })).toBeVisible(); // GPS that never moves
  });
});

test.describe("conditions", () => {
  test("a changed track surface is called out, with names for what was logged", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["odd-weather"]);
    await page.getByRole("button", { name: "Use lap 3 as comparison" }).click();
    await expect(page.getByText("Compared · Lap 3")).toBeVisible();
    await expect(page.getByText(/Surface was .* on the compared lap, dry on the reference/)).toBeVisible();
  });

  test("a wetness the app has no name for is shown as unknown", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["odd-weather"]);
    await page.getByRole("button", { name: "Use lap 1 as reference" }).click();
    await page.getByRole("button", { name: "Use lap 3 as comparison" }).click();
    await expect(page.getByText("Reference · Lap 1")).toBeVisible();
    await expect(page.getByText("Unknown").first()).toBeVisible();
    await expect(page.getByText(/Surface was .* on the compared lap, unknown on the reference/)).toBeVisible();
  });

  test("an unnamed wetness on the compared lap is called out as unknown", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["odd-weather"]);
    await page.getByRole("button", { name: "Use lap 1 as comparison" }).click();
    await expect(page.getByText("Compared · Lap 1")).toBeVisible();
    await expect(page.getByText(/Surface was unknown on the compared lap, dry on the reference/)).toBeVisible();
  });

  test("no wind note when one lap has no wind reading", async ({ page }) => {
    await loadDemo(page);
    await upload(page, FILES["no-wind"]);
    await expect(page.getByText(/Compared · .*lap 2/)).toBeVisible();
    await expect(page.getByText("Air temp")).toBeVisible();
    await expect(page.getByText(/Wind was/)).toHaveCount(0);
  });

  test("only conditions both laps logged are compared", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["no-track-temp"]);
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
    await expect(page.getByText("Air temp")).toBeVisible();
    await expect(page.getByText("Track temp")).toHaveCount(0);
  });

  test("a calmer lap is called out when the reference was windier", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["windy"]);
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
    await page.getByRole("button", { name: "Load demo" }).click(); // its best lap becomes the comparison
    await expect(page.getByText(/Compared · .*lap 2/)).toBeVisible();
    await expect(page.getByText(/Wind was \d+ (km\/h|mph) lighter on the compared lap/)).toBeVisible();
  });
});

test.describe("odd interactions", () => {
  test("cancelling the file picker changes nothing", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles([]);
    await expect(page.getByRole("heading", { name: "Where are you losing time?" })).toBeVisible();
    await expect(page.getByRole("alert")).toBeHidden();
  });

  test("changing laps mid-request drops the stale comparison", async ({ page }) => {
    await page.route("**/api/compare*", async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.continue();
    });
    await loadDemo(page);
    await page.getByRole("button", { name: "Use lap 1 as reference" }).click();
    await page.getByRole("button", { name: "Use lap 3 as reference" }).click(); // while lap 1 is loading
    await expect(page.getByText("Reference · Lap 3")).toBeVisible();
    await expect(page.getByRole("alert")).toBeHidden();
  });

  test("a drag that starts outside the plot area does not zoom", async ({ page }) => {
    await loadDemo(page);
    const box = await speedChartBox(page);
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 4, y); // in the margin, left of the y axis
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, y, { steps: 5 });
    await page.mouse.up();
    await page.mouse.move(box.x + box.width - 3, y, { steps: 3 }); // right margin
    await expect(page.getByText("Drag on any chart to zoom")).toBeVisible();
  });
});

test.describe("what the insights say", () => {
  test("a lap that brakes where the reference did not", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["driving-errors"]);
    await expect(page.getByText(/Reference · Lap/)).toBeVisible();
    await page.getByRole("button", { name: "Use lap 1 as reference" }).click();
    await page.getByRole("button", { name: "Use lap 2 as comparison" }).click();
    await expect(page.getByText("Reference · Lap 1")).toBeVisible();
    await expect(page.locator(".insight", { hasText: "braking where the reference lap didn't" }).first()).toBeVisible();
  });

  test("a lap that is late back to full throttle", async ({ page }) => {
    await page.goto("/");
    await fileInput(page).setInputFiles(FILES["driving-errors"]);
    await page.getByRole("button", { name: "Use lap 2 as reference" }).click();
    await page.getByRole("button", { name: "Use lap 3 as comparison" }).click();
    await expect(page.getByText("Compared · Lap 3")).toBeVisible();
    await expect(page.locator(".insight", { hasText: /full throttle .* later/ }).first()).toBeVisible();
  });

  test("a much windier lap is called out", async ({ page }) => {
    await loadDemo(page);
    await upload(page, FILES["windy"]);
    await expect(page.getByText(/Compared · .*lap 2/)).toBeVisible();
    await expect(page.getByText(/Wind was \d+ (km\/h|mph) stronger on the compared lap/)).toBeVisible();
  });
});

test.describe("units", () => {
  test.use({ locale: "de-DE" });

  test("follows the browser's region when nothing is stored", async ({ page }) => {
    await loadDemo(page);
    await expect(page.getByRole("button", { name: "km · m" })).toHaveAttribute("aria-pressed", "true");
  });

  test("a stored choice wins over the region", async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem("lap-analyzer.units", "imperial"));
    await loadDemo(page);
    await expect(page.getByRole("button", { name: "mi · ft" })).toHaveAttribute("aria-pressed", "true");
  });

  test("a locale without a region falls back to metric", async ({ page, context }) => {
    await context.addInitScript(() => Object.defineProperty(navigator, "language", { value: "en" }));
    await loadDemo(page);
    await expect(page.getByRole("button", { name: "km · m" })).toHaveAttribute("aria-pressed", "true");
  });

  test("works when the browser blocks storage", async ({ page, context }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("storage blocked");
        },
      });
    });
    await loadDemo(page);
    await page.getByRole("button", { name: "mi · ft" }).click();
    await expect(page.getByRole("button", { name: "mi · ft" })).toHaveAttribute("aria-pressed", "true");
  });
});
