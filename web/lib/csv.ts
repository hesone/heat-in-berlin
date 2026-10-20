import type { AnalysisResult, BuildingFeature } from "./types";

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const row = (xs: (string | number | null | undefined)[]) => xs.map(cell).join(",");

/** CSV with the area summary as commented header lines, then one row per counted building.
 * Every value is an estimate; the header says so. */
export function analysisCsv(result: AnalysisResult, buildings: BuildingFeature[], osmTimestamp: string): string {
  const lines = [
    "# Heat in Berlin area analysis (all values are ESTIMATES, indicative only)",
    `# OSM data as of ${osmTimestamp}; © OpenStreetMap contributors, ODbL 1.0`,
    `# area_ha=${result.area_ha}; buildings=${result.buildings}; heat_mwh_a=${result.heat_mwh_a}; ` +
      `heat_density_mwh_ha_a=${result.heat_density_mwh_ha_a}; band=${result.band.id}; pv_kwp=${result.pv_kwp}`,
    `# bands: ${result.band_source.title}`,
    row(["osm_id", "address", "osm_building_tag", "category", "footprint_m2", "floors", "floors_source", "heat_kwh_a", "pv_kwp", "pv_kwh_a"]),
  ];
  for (const b of buildings) {
    const p = b.properties;
    lines.push(row([p.osm, p.addr, p.building, p.cat, p.fp_m2, p.levels, p.levels_src, p.heat_kwh_a, p.pv_kwp, p.pv_kwh_a]));
  }
  return lines.join("\n") + "\n";
}
