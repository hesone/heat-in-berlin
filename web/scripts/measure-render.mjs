// Time to first map render: ms from navigation start until MapLibre's first "idle" after the building
// layer has its data (window.__waermeMetrics, set in components/MapView.tsx).
// Usage: start the app (npm run build && npx next start -p 3100), then
//   node scripts/measure-render.mjs [url] [runs]
// Each run uses a fresh browser context (cold cache).
import { chromium } from "@playwright/test";

const url = process.argv[2] ?? "http://127.0.0.1:3100/";
const runs = Number(process.argv[3] ?? 7);
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const results = [];
for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => window.__waermeMetrics !== undefined, null, { timeout: 60_000 });
  results.push(await page.evaluate(() => window.__waermeMetrics));
  await ctx.close();
}
await browser.close();
const ms = results.map((r) => r.firstRenderMs).sort((a, b) => a - b);
console.log(JSON.stringify({ url, runs, buildings: results[0].buildings, firstRenderMs: ms, median: ms[Math.floor(ms.length / 2)], browser: "chromium (Playwright)" }, null, 1));
