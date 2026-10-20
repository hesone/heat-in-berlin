import { describe, expect, it } from "vitest";
import { formatArea, formatDensity, formatEnergyPerYear, formatHectares, formatNumber, formatPower } from "@/lib/format";

describe("number formatting", () => {
  it("groups thousands with en-GB separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(3.14159, 2)).toBe("3.14");
  });

  it.each([
    [850, "850 kWh/a"],
    [12_345, "12.3 MWh/a"],
    [254_755, "255 MWh/a"],
    [1_013_368_300, "1,013 GWh/a"],
    [12_345_678, "12.3 GWh/a"],
  ])("formats %d kWh/a as %s", (kwh, expected) => {
    expect(formatEnergyPerYear(kwh)).toBe(expected);
  });

  it("formats power, area, hectares and density with units", () => {
    expect(formatPower(9.76)).toBe("9.8 kWp");
    expect(formatPower(10_058.7)).toBe("10.06 MWp");
    expect(formatPower(142_888.9)).toBe("142.9 MWp");
    expect(formatArea(357.5)).toBe("358 m²");
    expect(formatHectares(52.86)).toBe("52.9 ha");
    expect(formatHectares(3.456)).toBe("3.46 ha");
    expect(formatDensity(1827.9)).toBe("1,828 MWh/(ha·a)");
  });
});

import { humaniseAnalysisError } from "@/lib/data";

describe("analysis error messages", () => {
  it.each([
    ["area is larger than 2000 ha", /too large.*2,000 ha/],
    ["polygon is not valid (self-intersecting?)", /crosses itself/],
    ["polygon is empty", /empty/],
    ["boom", /could not be analysed: boom/],
  ])("%s", (raw, expected) => {
    expect(humaniseAnalysisError(raw)).toMatch(expected);
  });
});
