import { describe, expect, it } from "vitest";
import { analysisCsv } from "@/lib/csv";
import { bandScalePosition } from "@/lib/scale";
import type { AnalysisResult, BuildingFeature } from "@/lib/types";
import { META } from "./fixtures/meta";

const bands = META.benchmarks.heat_density_bands;

describe("bandScalePosition", () => {
  it.each([
    [0, 0],
    [70, 20],
    [122.5, 30], // halfway through 70–175
    [1050, 80],
    [1775, 90], // halfway between 1,050 and the 2,500 display cap
    [99_999, 100],
  ])("density %d → %d %%", (d, pos) => {
    expect(bandScalePosition(d, bands)).toBeCloseTo(pos, 5);
  });
});

describe("analysisCsv", () => {
  const result = {
    area_ha: 10, buildings: 2, heat_mwh_a: 300, heat_density_mwh_ha_a: 30, pv_kwp: 5,
    band: { id: "none" }, band_source: { title: "Leitfaden Wärmeplanung" },
  } as unknown as AnalysisResult;
  const b = (osm: string, addr: string | null, heat: number | null) =>
    ({ properties: { osm, addr, building: "yes", cat: "MFH", fp_m2: 100, levels: 4, levels_src: "default", heat_kwh_a: heat, pv_kwp: 1, pv_kwh_a: 891 } }) as unknown as BuildingFeature;

  it("labels the file as estimates, includes attribution, and escapes cells", () => {
    const csv = analysisCsv(result, [b("w1", 'Kant "Ecke", 1', 300_000), b("w2", null, null)], "2026-10-20T18:06:39Z");
    const lines = csv.trim().split("\n");
    expect(lines[0]).toMatch(/ESTIMATES/);
    expect(lines[1]).toMatch(/ODbL/);
    expect(lines[4]).toBe("osm_id,address,osm_building_tag,category,footprint_m2,floors,floors_source,heat_kwh_a,pv_kwp,pv_kwh_a");
    expect(lines[5]).toBe('w1,"Kant ""Ecke"", 1",yes,MFH,100,4,default,300000,1,891');
    expect(lines[6]).toBe("w2,,yes,MFH,100,4,default,,1,891");
  });
});
