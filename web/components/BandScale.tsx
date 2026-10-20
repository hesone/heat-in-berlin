import { formatNumber } from "@/lib/format";
import { BAND_COLORS } from "@/lib/legend";
import { bandScalePosition } from "@/lib/scale";
import type { Band } from "@/lib/types";

export function BandScale({ density, bands, berlinThreshold }: { density: number; bands: Band[]; berlinThreshold: number | null }) {
  const pos = bandScalePosition(density, bands);
  const berlin = berlinThreshold !== null ? bandScalePosition(berlinThreshold, bands) : null;
  return (
    <figure className="m-0" aria-label={`Position of ${formatNumber(density)} MWh per hectare and year on the five suitability bands`}>
      <div className="relative pt-[22px]">
        <div
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] font-semibold"
          style={{ left: `${Math.min(Math.max(pos, 8), 92)}%` }}
        >
          this area
        </div>
        <div data-testid="scale-marker" className="absolute top-4 -ml-px h-7 w-0.5 bg-ink" style={{ left: `${pos}%` }} />
        {berlin !== null && <div className="absolute top-4 h-7 border-l-2 border-dashed border-warn-fg" style={{ left: `${berlin}%` }} />}
        <div aria-hidden="true" className="grid h-[18px] grid-cols-5 overflow-hidden rounded border border-[#5a5a5a]">
          {bands.map((b) => (
            <span key={b.id} style={{ background: BAND_COLORS[b.id] }} />
          ))}
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-5 font-mono text-[11px] text-subtle" aria-hidden="true">
        {bands.map((b) => (
          <span key={b.id}>{formatNumber(b.min)}</span>
        ))}
      </div>
      {berlinThreshold !== null && (
        <figcaption className="mt-2 flex items-center gap-1.5 text-xs text-subtle">
          <span aria-hidden="true" className="w-3.5 border-t-2 border-dashed border-warn-fg" />
          Berlin Wärmeplan threshold: {formatNumber(berlinThreshold)} MWh/(ha·a)
        </figcaption>
      )}
    </figure>
  );
}
