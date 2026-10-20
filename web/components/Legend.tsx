import { useId } from "react";
import { BAND_COLORS, BAND_SHORT, HEAT_CLASSES, NOT_ESTIMATED_COLOR, bandRangeLabel, heatClassIndex } from "@/lib/legend";
import type { Band } from "@/lib/types";

export const HATCH = `repeating-linear-gradient(45deg, ${NOT_ESTIMATED_COLOR} 0 3px, #6b6b6b 3px 4px)`;

const TICKS = ["<50", "50", "100", "200", "400", "800+"];

/** Compact map legend. Colours carry no meaning alone: every class has a text label or tick, and the
 * full class ranges are announced to screen readers. */
export function Legend({
  layer,
  bands,
  markerKwh = null,
}: {
  layer: "buildings" | "hexagons";
  bands: Band[];
  markerKwh?: number | null;
}) {
  const titleId = useId();
  if (layer === "buildings") {
    const markerLeft = markerKwh !== null ? ((heatClassIndex(markerKwh) + 0.5) / HEAT_CLASSES.length) * 100 : null;
    return (
      <section aria-labelledby={titleId} className="text-sm">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id={titleId} className="font-semibold">
            Heat demand per building
          </h2>
          <span className="text-xs text-muted">MWh/a · estimate</span>
        </div>
        <ul className="sr-only">
          {HEAT_CLASSES.map((c) => (
            <li key={c.label}>{c.label} MWh/a</li>
          ))}
        </ul>
        <div className="relative mt-2.5" aria-hidden="true">
          <div className="grid h-3 grid-cols-6 overflow-hidden rounded-[3px] border border-[#5a5a5a]">
            {HEAT_CLASSES.map((c) => (
              <span key={c.label} style={{ background: c.color }} />
            ))}
          </div>
          {markerLeft !== null && (
            <span
              data-testid="legend-marker"
              className="absolute -top-1 h-5 w-[3px] -translate-x-1/2 border border-white bg-ink"
              style={{ left: `${markerLeft}%` }}
            />
          )}
        </div>
        <div className="mt-1 grid grid-cols-6 font-mono text-[11px] text-subtle" aria-hidden="true">
          {TICKS.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        {markerLeft !== null ? (
          <p className="mt-2 text-xs text-subtle">Marker: the selected building</p>
        ) : null}
        <p className="mt-2.5 flex items-center gap-2 text-xs text-subtle">
          <span aria-hidden="true" className="h-3 w-[22px] shrink-0 rounded-[3px] border border-[#5a5a5a]" style={{ background: HATCH }} />
          Not estimated: non-residential or unknown use
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby={titleId} className="text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={titleId} className="font-semibold">
          Heat density
        </h2>
        <span className="text-xs text-muted">MWh/(ha·a) · estimate</span>
      </div>
      <ul className="mt-2.5 space-y-1.5 text-[12.5px]">
        {bands.map((b) => (
          <li key={b.id} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-5 shrink-0 rounded-[3px] border border-[#5a5a5a]" style={{ background: BAND_COLORS[b.id] }} />
            <span className="w-[74px] shrink-0 font-mono">{bandRangeLabel(b).replace(" and more", "+").replace(" – ", "–")}</span>
            <span>{BAND_SHORT[b.id]}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 text-subtle">
          <span aria-hidden="true" className="h-2.5 w-[18px] shrink-0 rounded-sm border border-dashed border-[#333]" />
          Cut by the district boundary
        </li>
      </ul>
    </section>
  );
}
