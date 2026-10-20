import { bandFor } from "./legend";
import type { Band, HexCollection, Meta } from "./types";

export interface DistrictSummary {
  avgDensity: number;
  areaHa: number;
  heatMwh: number;
  residential: number;
  pvKwp: number;
  buildings: number;
  levelsFromOsmShare: number;
  interiorHexes: number;
  edgeHexes: number;
  hexesByBand: { band: Band; count: number }[];
}

export function districtSummary(meta: Meta, hexes: HexCollection): DistrictSummary {
  const bands = meta.benchmarks.heat_density_bands;
  const interior = hexes.features.filter((h) => !h.properties.edge);
  const counts = new Map<string, number>(bands.map((b) => [b.id, 0]));
  for (const h of interior) {
    const id = bandFor(h.properties.density_mwh_ha_a, bands).id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const lv = meta.levels_source_counts;
  const fromOsm = (lv["osm:building:levels"] ?? 0) + (lv["osm:height"] ?? 0);
  return {
    avgDensity: meta.totals.heat_mwh_a / meta.district_area_ha,
    areaHa: meta.district_area_ha,
    heatMwh: meta.totals.heat_mwh_a,
    residential: meta.with_heat_estimate,
    pvKwp: meta.totals.pv_kwp,
    buildings: meta.features_rendered,
    levelsFromOsmShare: fromOsm / meta.features_rendered,
    interiorHexes: interior.length,
    edgeHexes: hexes.features.length - interior.length,
    // highest band first, as in the design
    hexesByBand: [...bands].reverse().map((band) => ({ band, count: counts.get(band.id) ?? 0 })),
  };
}
