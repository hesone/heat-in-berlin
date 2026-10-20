# Measurements

Only numbers that were actually measured. Each entry says where, how, and with which script.
Re-run the scripts to reproduce; numbers will differ by machine.

## Data (2026-10-20)

From `backend/scripts/build_layers.py` on `data/raw/charlottenburg.overpass.json` (see `docs/data-coverage.md`):

| | |
|---|---|
| Buildings rendered on the map | 4,885 |
| … with a heat estimate (residential) | 3,866 |
| H3 hexagons (res. 9) | 130 |
| `buildings.geojson` size | 3,492,101 bytes |
| Layer build time | 0.8 s (single run, Linux aarch64 VM, Python 3.10) |

## API response time (2026-10-20)

`backend/scripts/measure_api.py`, gunicorn 2 workers `--preload`, client and server on the same machine
(Linux aarch64 VM on Hesam's Mac, 4 vCPU, Python 3.10.12). 50 requests per case after one warm-up,
new connection per request.

| Request | Median | p95 | Response size |
|---|---|---|---|
| `GET /api/buildings`, whole-district bbox | 43.2 ms | 44.1 ms | 3,492,101 B |
| `GET /api/buildings`, ~700 × 800 m bbox | 3.7 ms | 3.9 ms | 284,428 B |
| `POST /api/analyse`, 52.9 ha polygon | 0.5 ms | 0.7 ms | 679 B |

## Time to first map render (2026-10-20)

`web/scripts/measure-render.mjs`: ms from navigation start until MapLibre's first `idle` event after the
building layer received its data. 7 runs, fresh browser context each run.

Environment: production build (`next build && next start`), static demo mode, **blank basemap**
(`NEXT_PUBLIC_BASEMAP_STYLE=none`), headless Chromium (Playwright build 1194) with software WebGL,
cloud container with 2 vCPU (Intel Xeon 2.80 GHz), client and server on the same host.

| Runs (ms, sorted) | Median |
|---|---|
| 2543, 2700, 2795, 2947, 2966, 2990, 3038 | **2,947 ms** for 4,885 buildings |

After the UI redesign (same script, same environment, same day):

| Runs (ms, sorted) | Median |
|---|---|
| 2424, 2627, 2632, 2747, 2751, 2904, 2977 | **2,747 ms** for 4,885 buildings |

### Live deployment (2026-10-21)

Same script, run by Hesam on his MacBook Air against the Vercel deployment:
`node scripts/measure-render.mjs https://heat-in-berlin.vercel.app/ 7`. Playwright's Chromium in its default
(headless) mode, OpenFreeMap basemap (the deployed default), static demo mode, over Hesam's internet connection,
so network transfer of the 3.5 MB building file is included. Whether headless Chromium used the GPU was not recorded.

| Runs (ms, sorted) | Median |
|---|---|
| 1833, 1852, 1872, 1891, 2045, 2055, 2066 | **1,891 ms** for 4,885 buildings |

## Lighthouse (2026-10-20)

Lighthouse 12.8.2, `--preset=desktop`, same environment as above (blank basemap).
Full report: `docs/lighthouse-2026-10-20.json`.

| Category | Score |
|---|---|
| Performance | 67 |
| Accessibility | 100 (automated checks only) |
| Best practices | 100 |

Performance audits: FCP 0.2 s, LCP 1.0 s, Total Blocking Time 1,310 ms, CLS 0, Speed Index 1.6 s.

After the UI redesign (single run, same environment; report `docs/lighthouse-2026-10-20-redesign.json`):
Performance 63, Accessibility 100, Best practices 100; FCP 0.3 s, LCP 1.5 s, Total Blocking Time 1,910 ms,
CLS 0, Speed Index 1.6 s. Both are single runs; the difference has not been checked for run-to-run variance.

## Test counts (2026-10-20)

| Suite | Tests | Command |
|---|---|---|
| pytest (backend: estimation, classification, pipeline, analysis, API, benchmarks) | 67 | `cd backend && pytest` |
| Vitest + Testing Library (legend, panels, search, formatting, band scale, CSV, errors, Python parity) | 41 | `cd web && npm test` |
| Playwright end-to-end (draw + CSV download, keyboard selection, hexagon analysis, methodology round trip) | 4 | `cd web && npm run test:e2e` |
