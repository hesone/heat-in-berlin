import { describe, expect, it } from "vitest";
import { analyseLocally } from "@/lib/analysis";
import type { AnalysisResult, AreaGeometry, BuildingFeature } from "@/lib/types";
import parity from "./fixtures/parity.json";
import { META } from "./fixtures/meta";

type Case = { name: string; polygon: AreaGeometry; expected: AnalysisResult };

describe("static-mode analysis matches the Python backend", () => {
  const buildings = parity.buildings as unknown as BuildingFeature[];
  it.each(parity.cases as unknown as Case[])("$name", ({ polygon, expected }) => {
    const got = analyseLocally(polygon, buildings, META.benchmarks);
    expect(got.buildings).toBe(expected.buildings);
    expect(got.buildings_with_heat_estimate).toBe(expected.buildings_with_heat_estimate);
    expect(got.heat_mwh_a).toBeCloseTo(expected.heat_mwh_a, 0);
    expect(got.pv_kwp).toBeCloseTo(expected.pv_kwp, 0);
    // turf (spherical) vs EPSG:25833 (planar) area: allow 0.5 %
    expect(Math.abs(got.area_ha - expected.area_ha) / expected.area_ha).toBeLessThan(0.005);
    expect(got.band.id).toBe(expected.band.id);
  });
});
