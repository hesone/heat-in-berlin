import { expect, test, type Page } from "@playwright/test";

/** Centre the map on a large estimated building whose centroid lies inside its own footprint
 * (perimeter blocks have their centroid in the courtyard, so the largest building is not always clickable). */
async function centreOnEstimatedBuilding(page: Page) {
  const ok = await page.evaluate(async () => {
    const map = window.__waermeMap!;
    const idle = () => new Promise<void>((r) => map.once("idle", () => r()));
    const candidates = map
      .queryRenderedFeatures({ layers: ["buildings-fill"] })
      .filter((f) => f.properties.heat_kwh_a !== null && f.properties.heat_kwh_a !== undefined)
      .sort((a, b) => b.properties.fp_m2 - a.properties.fp_m2)
      .slice(0, 30)
      .map((f) => ({ id: f.id, cx: f.properties.cx as number, cy: f.properties.cy as number }));
    for (const c of candidates) {
      map.jumpTo({ center: [c.cx, c.cy], zoom: 18 });
      await idle();
      const p = map.project(map.getCenter());
      const hits = map.queryRenderedFeatures([p.x, p.y], { layers: ["buildings-fill"] });
      if (hits.some((h) => h.id === c.id)) return true;
    }
    return false;
  });
  expect(ok).toBe(true);
}

async function mapCentre(page: Page) {
  const box = (await page.getByTestId("map").boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

test("load map → click a building → draw an area → see the result", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("data-mode")).toHaveText("Static demo data");
  await page.waitForFunction(() => window.__waermeMetrics !== undefined);
  const metrics = await page.evaluate(() => window.__waermeMetrics!);
  test.info().annotations.push({ type: "first-map-render-ms", description: String(metrics.firstRenderMs) });
  test.info().annotations.push({ type: "buildings", description: String(metrics.buildings) });

  // Click a building
  await centreOnEstimatedBuilding(page);
  const c = await mapCentre(page);
  await page.mouse.click(c.x, c.y);
  await expect(page.getByText("How the heat demand was estimated")).toBeVisible();
  await expect(page.getByText("= Heat demand")).toBeVisible();
  await expect(page.getByRole("main", { name: "Map" }).getByTestId("legend-marker")).toBeVisible();
  await page.getByRole("button", { name: "Close building details" }).click();
  await expect(page.getByRole("heading", { name: /overview/ })).toBeVisible();

  // Draw an area around it
  await page.evaluate(async () => {
    const map = window.__waermeMap!;
    map.setZoom(16);
    await new Promise<void>((r) => map.once("idle", () => r()));
  });
  await page.getByRole("button", { name: "Draw area" }).click();
  const d = 150;
  const pts = [
    [c.x - d, c.y - d],
    [c.x + d, c.y - d],
    [c.x + d, c.y + d],
    [c.x - d, c.y + d],
  ];
  for (const [x, y] of pts) {
    await page.mouse.move(x, y);
    await page.mouse.click(x, y);
    await page.waitForTimeout(150);
  }
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.click(pts[0][0], pts[0][1]); // close polygon

  await expect(page.getByRole("heading", { name: "Drawn area" })).toBeVisible();
  await expect(page.getByTestId("heat-density")).toHaveText(/^[\d,]+$/);
  await expect(page.getByTestId("band-label")).not.toBeEmpty();
  await expect(page.getByText("Indicative")).toBeVisible();

  // Export the result
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^waerme-charlottenburg-area-\d{4}-\d{2}-\d{2}\.csv$/);
});

test("keyboard: focus the map and press Enter to select the building under the crosshair", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__waermeMetrics !== undefined);
  await centreOnEstimatedBuilding(page);
  await page.locator(".maplibregl-canvas").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("How the heat demand was estimated")).toBeVisible();
  await page.getByRole("button", { name: "Close building details" }).press("Enter");
  await expect(page.getByText("How the heat demand was estimated")).toHaveCount(0);
});

test("grid layer: click a hexagon, then analyse it", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__waermeMetrics !== undefined);
  await page.getByText("Heat-density grid").click();
  await expect(page.getByRole("heading", { name: "Heat density" })).toBeVisible();
  // centre the map on an interior hexagon and click it
  await page.evaluate(async () => {
    const map = window.__waermeMap!;
    await new Promise<void>((r) => (map.loaded() ? r() : map.once("idle", () => r())));
    const f = map.queryRenderedFeatures({ layers: ["hex-fill"] }).find((x) => x.properties.edge === false)!;
    const ring = (f.geometry as GeoJSON.Polygon).coordinates[0];
    const cx = ring.slice(0, -1).reduce((a, p) => a + p[0], 0) / (ring.length - 1);
    const cy = ring.slice(0, -1).reduce((a, p) => a + p[1], 0) / (ring.length - 1);
    map.jumpTo({ center: [cx, cy], zoom: 15 });
    await new Promise<void>((r) => map.once("idle", () => r()));
  });
  const c = await mapCentre(page);
  await page.mouse.click(c.x, c.y);
  const popup = page.getByRole("dialog", { name: /hexagon/i });
  await expect(popup).toBeVisible();
  await expect(popup.getByTestId("hex-density")).toHaveText(/^[\d,]+$/);
  await popup.getByRole("button", { name: "Analyse this hexagon" }).click();
  await expect(page.getByRole("heading", { name: "Hexagon" })).toBeVisible();
  await expect(page.getByTestId("band-label")).not.toBeEmpty();
});
