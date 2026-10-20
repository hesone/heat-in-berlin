import { formatEnergyPerYear, formatHectares, formatNumber, formatPower } from "@/lib/format";
import { BAND_COLORS, BAND_SHORT, bandFor } from "@/lib/legend";
import type { Band, HexProps } from "@/lib/types";
import { Icon, btn } from "./ui";

export function HexPopup({
  hex,
  bands,
  style,
  onAnalyse,
  onClose,
}: {
  hex: HexProps;
  bands: Band[];
  style: React.CSSProperties;
  onAnalyse: () => void;
  onClose: () => void;
}) {
  const band = bandFor(hex.density_mwh_ha_a, bands);
  return (
    <div role="dialog" aria-labelledby="hex-title" className="absolute z-10 w-[260px] rounded-[10px] bg-white p-3.5 shadow-[0_6px_20px_rgba(16,24,40,0.22)]" style={style}>
      <div className="flex items-start justify-between gap-2">
        <p id="hex-title" className="text-xs text-muted">
          Hexagon · {formatHectares(hex.area_ha)}
          {hex.edge && " · cut by boundary"}
        </p>
        <button type="button" aria-label="Close hexagon details" onClick={onClose} className="-mr-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-ground">
          <Icon.close />
        </button>
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="font-mono text-[22px] font-semibold" data-testid="hex-density">
          {formatNumber(hex.density_mwh_ha_a)}
        </span>
        <span className="text-[13px] text-subtle">MWh/(ha·a)</span>
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-[13px] font-semibold">
        <span aria-hidden="true" className="h-3 w-3 rounded-[3px] border border-[#5a5a5a]" style={{ background: BAND_COLORS[band.id] }} />
        {BAND_SHORT[band.id]}
        {band.id === "very_high" || band.id === "none" ? "" : " networks"}
      </p>
      <dl className="mt-2.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[12.5px]">
        <dt className="text-muted">Heat demand</dt>
        <dd className="font-mono">{formatEnergyPerYear(hex.heat_mwh_a * 1000)}</dd>
        <dt className="text-muted">Buildings</dt>
        <dd className="font-mono">
          {hex.buildings} ({hex.buildings_with_heat_estimate} estimated)
        </dd>
        <dt className="text-muted">Rooftop PV</dt>
        <dd className="font-mono">{formatPower(hex.pv_kwp)}</dd>
      </dl>
      <button type="button" onClick={onAnalyse} className={`${btn.secondary} mt-2.5 h-10 w-full justify-center`}>
        Analyse this hexagon
      </button>
    </div>
  );
}
