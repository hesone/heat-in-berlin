import type { Band } from "./types";

/** Display cap for the open-ended top band; values above it are drawn at the right edge. */
export const SCALE_CAP = 2500;

/** Position (0–100 %) of a density on a scale where every band gets an equal-width segment and values
 * are placed linearly inside their segment. Equal widths keep the narrow low bands readable. */
export function bandScalePosition(density: number, bands: Band[], cap = SCALE_CAP): number {
  const seg = 100 / bands.length;
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    const max = b.max ?? cap;
    if (density < max || i === bands.length - 1) {
      const t = Math.min(Math.max((density - b.min) / (max - b.min), 0), 1);
      return i * seg + t * seg;
    }
  }
  return 100;
}
