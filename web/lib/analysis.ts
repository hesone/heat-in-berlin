/** Client-side copy of backend/waerme/analysis.py for the static demo mode.
 * Same rule: a building counts if its centroid is inside the polygon; density uses the gross polygon area.
 * Area: @turf/area (spherical) instead of the backend's EPSG:25833 planar area; test/parity.test.ts
 * checks the two agree within 0.5 %. */
import turfArea from "@turf/area";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { bandFor } from "./legend";
import type { AnalysisResult, AreaGeometry, Benchmarks, BuildingFeature } from "./types";

const MAX_AREA_HA = 2000;

export class AnalysisError extends Error {}

const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/** The shared rule: a building belongs to the area if its centroid is strictly inside the polygon. */
export function buildingsInPolygon(polygon: AreaGeometry, buildings: BuildingFeature[]): BuildingFeature[] {
  return buildings.filter((b) => booleanPointInPolygon([b.properties.cx, b.properties.cy], polygon, { ignoreBoundary: true }));
}

export function analyseLocally(
  polygon: AreaGeometry,
  buildings: BuildingFeature[],
  benchmarks: Pick<Benchmarks, "heat_density_bands" | "sources" | "heat_density_bands_source" | "berlin_reference_threshold">,
): AnalysisResult {
  const areaHa = turfArea(polygon) / 10_000;
  if (areaHa <= 0) throw new AnalysisError("polygon is empty");
  if (areaHa > MAX_AREA_HA) throw new AnalysisError(`area is larger than ${MAX_AREA_HA} ha`);
  let n = 0, nHeat = 0, heat = 0, kwp = 0, pvKwh = 0;
  for (const b of buildingsInPolygon(polygon, buildings)) {
    const p = b.properties;
    n += 1;
    kwp += p.pv_kwp;
    pvKwh += p.pv_kwh_a;
    if (p.heat_kwh_a !== null) {
      nHeat += 1;
      heat += p.heat_kwh_a;
    }
  }
  const heatMwh = heat / 1000;
  const density = heatMwh / areaHa;
  const band = bandFor(density, benchmarks.heat_density_bands);
  return {
    area_ha: round(areaHa, 2),
    buildings: n,
    buildings_with_heat_estimate: nHeat,
    buildings_without_heat_estimate: n - nHeat,
    heat_mwh_a: round(heatMwh, 1),
    heat_density_mwh_ha_a: round(density, 1),
    pv_kwp: round(kwp, 1),
    pv_mwh_a: round(pvKwh / 1000, 1),
    band: { id: band.id, label: band.label, min: band.min, max: band.max },
    band_source: benchmarks.sources[benchmarks.heat_density_bands_source.source],
    berlin_reference_threshold_mwh_ha_a: benchmarks.berlin_reference_threshold.value,
    indicative: true,
    method: "Buildings counted by centroid; density = estimated heat demand / drawn area (gross).",
  };
}
