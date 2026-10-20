import type { Band } from "./types";

/** Building heat-demand classes in MWh/a. Breaks chosen from the Charlottenburg distribution
 * (roughly deciles/quartiles); colours: ColorBrewer YlOrRd 6-class (colour-blind safe). */
export const HEAT_CLASSES = [
  { min: 0, max: 50, color: "#ffffb2", label: "under 50" },
  { min: 50, max: 100, color: "#fed976", label: "50 – 100" },
  { min: 100, max: 200, color: "#feb24c", label: "100 – 200" },
  { min: 200, max: 400, color: "#fd8d3c", label: "200 – 400" },
  { min: 400, max: 800, color: "#f03b20", label: "400 – 800" },
  { min: 800, max: null, color: "#bd0026", label: "800 and more" },
] as const;

export const NOT_ESTIMATED_COLOR = "#d9d9d9";

/** Heat-density bands (MWh/(ha·a)) for the hexagon grid. ColorBrewer YlGnBu 5-class. */
export const BAND_COLORS: Record<Band["id"], string> = {
  none: "#ffffcc",
  new_build: "#a1dab4",
  low_temp: "#41b6c4",
  conventional: "#2c7fb8",
  very_high: "#253494",
};

export function heatClassFor(kwh: number | null) {
  if (kwh === null) return null;
  const mwh = kwh / 1000;
  return HEAT_CLASSES.find((c) => mwh >= c.min && (c.max === null || mwh < c.max)) ?? HEAT_CLASSES[0];
}

export function bandFor(density: number, bands: Band[]): Band {
  const b = bands.find((x) => density >= x.min && (x.max === null || density < x.max));
  if (!b) throw new Error(`no band for density ${density}`);
  return b;
}

export function bandRangeLabel(b: Band): string {
  return b.max === null ? `${b.min.toLocaleString("en-GB")} and more` : `${b.min.toLocaleString("en-GB")} – ${b.max.toLocaleString("en-GB")}`;
}

export const BAND_SHORT: Record<Band["id"], string> = {
  none: "No potential",
  new_build: "New-build only",
  low_temp: "Low-temperature",
  conventional: "Conventional",
  very_high: "Very high",
};

/** Index (0–5) of the heat class for a building, used to place the legend marker. */
export function heatClassIndex(kwh: number): number {
  const mwh = kwh / 1000;
  const i = HEAT_CLASSES.findIndex((c) => mwh >= c.min && (c.max === null || mwh < c.max));
  return i < 0 ? 0 : i;
}
