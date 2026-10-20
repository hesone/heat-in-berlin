# Methodology (summary)

The full, rendered version with all values is the `/methodology` page of the app
(`web/app/methodology/page.tsx`), generated from `backend/waerme/benchmarks.py` via `meta.json`.
Every constant below lives in `benchmarks.py` with its source key.

## Sources

| Key | Source | Used for |
|---|---|---|
| `ifeu_waermeatlas` | ifeu: Modellbeschreibung Wärmeatlas 2.0, Abschn. 3.2, S. 10 | A_N = 0.32 · V_e |
| `iwu_typology_2015` | Loga, T. et al. (2015): Deutsche Wohngebäudetypologie, IWU. Anhang C.3 (PDF p. 113), Tab. 4 (p. 19), Kap. 5.4 (p. 40) | Specific heat demand, stock weights, Wohnfläche → A_N factor 0.8 |
| `agora_dach_pv_2023` | greenventory GmbH (2023): Begleitdokumentation „Solarstrom vom Dach“ for Agora Energiewende, v1.1, S. 7, Anhang 1 (S. 11) | PV chain factors, 50 m² minimum footprint |
| `berlin_umweltatlas_solar` | Umweltatlas Berlin: Solaranlagen 2023 (IP SYSCON 2022), text and Tab. 5 | 891 kWh/kWp·a (derived: 7,929 GWh/a ÷ 8,894,703 kWp) |
| `leitfaden_waermeplanung_2024` | Ortner, S. et al. (2024): Leitfaden Wärmeplanung, BMWK/BMWSB, Tabelle 11, p. 54 (from MUKE Baden-Württemberg 2020) | Heat-density suitability bands |
| `berlin_waermeplanung` | SenMVKU Berlin: Inhaltliche Beschreibung Wärmeplanung (Geoportal) | 400 MWh/(ha·a) reference threshold |
| — | OpenStreetMap (ODbL 1.0), extract 2026-10-20T18:06:39Z | Footprints, floors, roof shape, landuse |

## Formulas

- V_e = footprint × floors × 3.0 m (storey height: project assumption)
- A_N = 0.32 × V_e
- Heat [kWh/a] = A_N × q, with q = stock-weighted IWU "Wärmeerzeugung Heizung + Warmwasser" (existing state,
  calibrated to consumption) × 0.8: EFH 142.4, RH 118.2, MFH (IWU MFH + GMH) 134.5 kWh/(m² A_N·a)
- PV [kWp] = footprint / cos(slope) × usable share × module share × 0.205 kWp/m²
  (flat: 5°, 0.75, 0.35; pitched: 35°, 0.60, 0.65); 0 below 50 m² footprint
- PV [kWh/a] = kWp × 891
- Area heat density = Σ heat of buildings whose centroid is inside the polygon ÷ polygon gross area

## Project assumptions (no external source)

Storey height 3.0 m; default floors EFH/RH 2, MFH 4, other 2; generic `building=yes` in residential landuse:
< 30 m² ancillary, < 250 m² and ≤ 3 floors EFH, else MFH; unknown roof shape: pitched for EFH/RH, flat otherwise.

## Limitations

See the methodology page. Main ones: no building age (German stock average), no non-residential heat,
31 % default floor counts, mixed use treated as residential, PV without shading/orientation/structural
checks, density bands defined on final energy while the tool uses heat generation.
