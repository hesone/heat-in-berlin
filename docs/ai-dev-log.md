# AI-assisted development log

Facts only: what the agent (Claude, via Claude Code) produced, what Hesam changed or
rejected, and bugs found in review. Hesam writes the conclusions section himself.

Legend for the "Review" column: **pending**: not yet reviewed by Hesam;
**accepted / changed / rejected**: Hesam's decision (with reason).

## Conclusions

_To be written by Hesam._

---

## 2026-10-20: Data check and plan (no code)

| What | Produced by | Review |
|---|---|---|
| Data-availability check: Overpass, Geofabrik, Berlin Geoportal and tile servers unreachable from the agent's sandbox; only GitHub/npm/PyPI reachable | agent | pending |
| Berlin-wide OSM coverage from Geofabrik taginfo: ~538k `building` objects, ~199k with `building:levels` (upper bound, includes `building:part`) | agent | pending |
| Heat-density bands 0/70/175/415/1050 MWh/(ha·a), found in two municipal Wärmepläne citing the Leitfaden Wärmeplanung / KEA-BW; Berlin Wärmeplan uses 400 | agent | pending |
| Method choice: A_N = 0.32·V_e (ifeu), IWU typology demand, Agora/greenventory PV chain | agent proposed | Hesam approved plan ("approve") |
| District Schmargendorf, residential-only heat estimates, OSM levels + type defaults | agent proposed defaults | Hesam approved plan without choosing between the listed options; agent took the recommended defaults |

Open at this point: IWU specific-demand values not extractable with the agent's PDF reader (appendix tables beyond the reader's limit); needed the PDF locally. Resolved below.

## 2026-10-20: Scaffold, fetch script, estimation library

| What | Produced by | Review |
|---|---|---|
| `backend/scripts/fetch_osm.py` (stdlib only, so it runs on a bare Mac `python3`) | agent | pending |
| Query restricted to admin_level=10 *inside Berlin* because a village named Schmargendorf also exists in Brandenburg | agent | pending |
| Added landuse polygons to the fetch so `building=yes` footprints can be classified (residential landuse → EFH/MFH by footprint/levels) | agent | pending |
| `waerme/benchmarks.py`: all constants with source keys; `value=None` blocks the build; `verified=False` flags values not yet checked against the primary page | agent | pending |
| Classification thresholds (ancillary < 30 m², EFH < 250 m² and ≤ 3 floors) and default floor counts (EFH/RH 2, MFH 4) | agent (project assumptions, no source) | pending, Hesam to confirm or change |
| Unknown roof shape → pitched for EFH/RH, flat otherwise | agent (assumption) | pending |
| Buildings assigned to the district by representative point, to avoid double counting with neighbouring Ortsteile | agent | pending |
| Hexagons cut by the district boundary flagged `edge: true` (their density only includes this district's buildings) | agent | pending |
| 46 pytest tests on a synthetic Overpass fixture; all passed on first run | agent | pending |

Bugs found in review: none yet.

## 2026-10-20: District switched to Charlottenburg

| What | Produced by | Review |
|---|---|---|
| Hesam ran the fetch for Charlottenburg; agent asked whether to switch, Hesam chose Charlottenburg | Hesam (decision) | n/a |
| Coverage measured on the real extract (see `docs/data-coverage.md`): 61.6% of buildings have `building:levels` | agent (script output) | pending |
| `--allow-pending` build mode: heat fields left empty (not filled with placeholders) while IWU values are missing | agent | pending |

Bugs found in review (agent self-review of real output, before commit):
- Footprints tagged `stairs`, `elevator`, `gate`, `viaduct`, `electricity` were classified "unknown" and would
  have been shown as buildings with PV potential. Fix: added to the unheated list; tests added.
- `mall`, `station`, `transportation`, `guardhouse` fell through to "unknown"; now non-residential.

## 2026-10-20: Working agreement change

| What | Produced by | Review |
|---|---|---|
| Agent had made 3 local commits (never pushed). Hesam: "don't commit files … give it to me for review and commit" | Hesam (instruction) | n/a |
| Agent removed the 3 commits (`git update-ref -d HEAD`), working tree unchanged; from then on no commits by the agent | agent | pending |

## 2026-10-20: Benchmark values pinned from the PDFs Hesam downloaded

| What | Produced by | Review |
|---|---|---|
| Leitfaden Wärmeplanung: bands confirmed in Tabelle 11, p. 54; the Leitfaden attributes them to MUKE Baden-Württemberg (2020) and says they refer to *Endenergie* | agent (pdftotext + reading) | pending |
| IWU 2015 Anhang C.3, PDF p. 113 ("korrigiert auf Niveau von Verbrauchswerten", Referenzklima Deutschland, variant 001) transcribed by script; Tab. 4 living-area weights transcribed | agent | pending, Hesam to spot-check against the PDF |
| Choice of IWU column: "Wärmeerzeugung Heizung + Warmwasser" (heat delivered by the generator), not "Endenergie fossil" (boiler fuel input) | agent | pending; a methodological choice Hesam should confirm |
| Choice: calibrated-to-consumption values instead of standard-boundary-condition values (standard values are ~1.8× higher for EFH_A: 366.7 vs 208.6 kWh/(m²·a)) | agent | pending |
| Project MFH = IWU MFH + GMH, stock-weighted; result EFH 142.4 / RH 118.2 / MFH 134.5 kWh/(m² A_N·a) after the IWU factor 0.8 (Wohnfläche → A_N) | agent | pending |
| greenventory/Agora PV factors verified against Anhang 1 p. 11; the 35 % / 65 % column mapping the web reader was unsure about is correct; added the 50 m² minimum footprint rule from the same table | agent | pending |
| Berlin Solaratlas figures re-checked: 8,894,703 kWp (Tab. 5) and 7,929 GWh/a (text) | agent | pending |
| Regression tests for transcribed values (Tab. 4 row sums match the published totals) | agent | pending |

Not adopted from the PV study (documented as limitation): structural-unsuitability shares (10–20 %),
east-west split and orientation-dependent yields.

## 2026-10-20: Django API

| What | Produced by | Review |
|---|---|---|
| DRF API without database or auth; layers loaded once per process; STRtree for bbox queries | agent | pending |
| Endpoints `/api/buildings?bbox=` (bbox required, validated), `/api/analyse` (Polygon/MultiPolygon or Feature; 400 on invalid, self-intersecting, > 2,000 ha or > 2,000 vertices), `/api/hexagons`, `/api/meta`, `/api/health` | agent | pending |
| 12 endpoint tests against layers built from the synthetic fixture | agent | pending |

## 2026-10-20: Frontend

| What | Produced by | Review |
|---|---|---|
| Next.js 16.4 scaffold via create-next-app; the generated `AGENTS.md` instructs agents to read the bundled Next docs first, which the agent did for static rendering and `next/dynamic` | agent | pending |
| MapLibre map, Terra Draw polygon drawing, TanStack Query data layer with API → static fallback, legend, building panel, analysis panel, address combobox, methodology page generated from `meta.json` | agent | pending |
| Legend breaks 50/100/200/400/800 MWh/a chosen from the measured distribution (10th–90th percentile 42–480 MWh/a) | agent | pending |
| Static-mode area analysis in TypeScript (turf), with a parity test against Python results on 3 real-data polygons; passed on first run | agent | pending |
| Keyboard paths: address combobox; Enter on the focused map selects the building under a crosshair; "Analyse current map view" as non-pointer alternative to drawing | agent | pending |

Bugs found in review:
- **Accessible name bug (caught by a Vitest test the agent wrote):** the close button's name was computed as
  "Closebuilding details" because the leading space inside the `sr-only` span is dropped. Fix: explicit `aria-label`.
- **ESLint `react-hooks/refs` error:** a ref was assigned during render in `MapView`. Fix: assign in an effect.
- **Map never loaded in the production build (caught by the agent in headless Chromium):** MapLibre 6 resolves its
  worker via `import.meta.url`, which does not survive Turbopack bundling ("Worker failed to load"). Fix:
  `scripts/copy-maplibre-worker.mjs` copies the worker into `public/` before dev/build, plus `setWorkerUrl`.
- **False e2e failure (test bug):** the test clicked the centroid of the largest building, which for Berlin
  perimeter blocks lies in the courtyard. Fix: the test picks a building whose centroid is inside its footprint.
- npm peer conflict: Vitest 5 requires `@types/node` ≥ 22; create-next-app had installed ^20.

## 2026-10-20: Delivery and measurements

| What | Produced by | Review |
|---|---|---|
| Dockerfiles, `docker-compose.yml`, GitHub Actions (backend lint+tests, web lint+types+tests+build, Playwright, Compose smoke test) | agent | pending; **not run yet**: no Docker in the agent's environments, CI runs only after Hesam pushes |
| Measurements in `docs/measurements.md` (API timing, first render, Lighthouse) with environment per number | agent (scripts + runs) | pending |
| Lighthouse Performance 67 with Total Blocking Time 1,310 ms; not optimised (likely main-thread GeoJSON parsing) | agent (measured) | open |

## 2026-10-20: UI/UX redesign

| What | Produced by | Review |
|---|---|---|
| Hesam asked for a better UI/UX "based on the product"; agent made a 4-artboard design canvas (area analysis, building detail, heat-density grid, phone), using crops of real app renders and real numbers | agent | Hesam: "build it" |
| Implemented in `web/`: map-first layout, top bar with layer switch and search, floating map toolbar and zoom controls, compact legend ramp, band scale, calculation-chain building panel, district overview, hexagon popup with "Analyse this hexagon", CSV export, compare-with-previous, phone bottom sheet | agent | pending |
| Fonts via `@fontsource` (self-hosted) instead of `next/font/google`, because builds in the agent's environments cannot reach Google Fonts | agent | pending |
| Analysed area shown by a map layer; Terra Draw is cleared after finishing, so drawn, map-view and hexagon areas look the same | agent | pending |
| Tests: Vitest 24 → 41, Playwright 2 → 3 (hexagon flow; CSV download checked in the main flow) | agent | pending |

Bugs found in review (agent, from screenshots and test failures, before handing over):
- **Duplicate element id:** the legend is rendered twice (map overlay on desktop, inside the bottom sheet on phones),
  so `legend-title` appeared twice in the DOM. Caught by a Playwright strict-mode failure. Fix: `useId`.
- **Silently diluted density (pre-existing, also in the old UI):** areas reaching beyond the district boundary
  were divided by their full area although no buildings are loaded outside. Fix: the panel now warns when the
  area is not within the district (`@turf/boolean-within`). The number itself is unchanged.
- **Raw validation errors shown to users** ("area is larger than 2000 ha"); on phones "Use map view" at district
  zoom triggers it. Fix: `humaniseAnalysisError` with actionable messages.
- Phone layout: the top bar took ~22 % of the screen and the toolbar wrapped; the overview sheet covered the district on first load.
  Fix: compact top bar, shorter toolbar labels below 640 px, sheet starts collapsed on phones.
- "1,013.4 GWh/a" and "142.89 MWp" wrapped in stat cards: large values now use fewer decimals.

Measured after the redesign: first render median 2,747 ms (was 2,947); Lighthouse Performance 63 (was 67),
TBT 1,910 ms (was 1,310). Single runs, same environment; not checked for variance.
