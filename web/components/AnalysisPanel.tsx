import { formatDensity, formatEnergyPerYear, formatHectares, formatNumber, formatPower } from "@/lib/format";
import { BAND_COLORS } from "@/lib/legend";
import type { AnalysisResult, Band, DataMode } from "@/lib/types";
import { BandScale } from "./BandScale";
import { HATCH } from "./Legend";
import { EstimateChip, Icon, Section, StatCard, btn } from "./ui";

export function AnalysisPanel({
  result: r,
  previous,
  bands,
  mode,
  title = "Drawn area",
  outsideDistrict = false,
  district = "the district",
  onClear,
  onDownload,
  onCompare,
}: {
  result: AnalysisResult;
  previous: AnalysisResult | null;
  bands: Band[];
  mode: DataMode;
  title?: string;
  outsideDistrict?: boolean;
  district?: string;
  onClear: () => void;
  onDownload: () => void;
  onCompare: () => void;
}) {
  const covered = r.buildings ? r.buildings_with_heat_estimate / r.buildings : 0;
  const delta = previous ? r.heat_density_mwh_ha_a - previous.heat_density_mwh_ha_a : 0;
  return (
    <div className="flex min-h-full flex-col" aria-live="polite">
      <div className="flex flex-col gap-1.5 border-b border-line-soft px-6 pb-4 pt-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-1">
            <EstimateChip>Indicative</EstimateChip>
            <button type="button" aria-label="Clear area" onClick={onClear} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg hover:bg-ground">
              <Icon.close />
            </button>
          </div>
        </div>
        <p className="font-mono text-[12.5px] text-muted">
          {formatHectares(r.area_ha)} · {formatNumber(r.buildings)} buildings
        </p>
      </div>

      <Section id="Heat density" className="flex flex-col gap-3.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">Heat density</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-[44px] font-semibold leading-none tracking-tight" data-testid="heat-density">
              {formatNumber(r.heat_density_mwh_ha_a)}
            </span>
            <span className="text-[15px] text-subtle">MWh/(ha·a)</span>
          </p>
          <span className="sr-only">{formatDensity(r.heat_density_mwh_ha_a)}</span>
        </div>
        <p className="flex items-center gap-2.5 rounded-lg bg-ground px-3 py-2.5">
          <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-[3px] border border-[#5a5a5a]" style={{ background: BAND_COLORS[r.band.id] }} />
          <span className="font-semibold" data-testid="band-label">
            {r.band.label}
          </span>
        </p>
        <BandScale density={r.heat_density_mwh_ha_a} bands={bands} berlinThreshold={r.berlin_reference_threshold_mwh_ha_a} />
        <p className="text-xs text-subtle">
          Bands:{" "}
          <a href={r.band_source.url} target="_blank" rel="noreferrer" className="underline">
            {r.band_source.title}
          </a>
          , Tabelle 11
        </p>
        {previous && (
          <div className="rounded-lg border border-line-soft p-3 text-sm" data-testid="comparison">
            <p className="font-semibold">Compared with the previous area</p>
            <p className="mt-1 text-subtle">
              Previous: <span className="font-mono">{formatDensity(previous.heat_density_mwh_ha_a)}</span> ({previous.band.label.toLowerCase()})
            </p>
            <p className="text-subtle">
              This area is{" "}
              <span className="font-mono font-semibold text-ink">
                {delta >= 0 ? "+" : "−"}
                {formatNumber(Math.abs(delta))}
              </span>{" "}
              MWh/(ha·a) {delta >= 0 ? "denser" : "less dense"}.
            </p>
          </div>
        )}
      </Section>

      <Section id="Totals" className="grid grid-cols-2 gap-3">
        <StatCard label="Heat demand" value={formatNumber(r.heat_mwh_a)} sub="MWh/a · heating + hot water" />
        <StatCard label="Rooftop PV potential" value={formatPower(r.pv_kwp)} sub={`${formatEnergyPerYear(r.pv_mwh_a * 1000)} electricity`} />
      </Section>

      <Section id="cov-title" title="Data coverage in this area" className="flex flex-col gap-2.5">
        <div aria-hidden="true" className="flex h-2.5 overflow-hidden rounded-full bg-chip">
          <span className="bg-subtle" style={{ width: `${covered * 100}%` }} />
          <span style={{ width: `${(1 - covered) * 100}%`, background: HATCH }} />
        </div>
        <div className="flex justify-between gap-3 text-[13px]">
          <span>
            <strong className="font-mono">{formatNumber(r.buildings_with_heat_estimate)}</strong> with heat estimate
          </span>
          <span>
            <strong className="font-mono">{formatNumber(r.buildings_without_heat_estimate)}</strong> not estimated
          </span>
        </div>
        {outsideDistrict && (
          <p className="rounded-lg bg-warn-bg px-3 py-2 text-[13px] text-warn-fg" data-testid="outside-warning">
            Part of this area lies outside {district}, where no buildings are loaded. The density is understated; draw
            inside the dashed boundary for a reliable figure.
          </p>
        )}
        {r.buildings_without_heat_estimate > 0 && (
          <p className="text-[13px] text-subtle">
            Non-residential buildings are left out of the heat total, so the real density here is likely higher than shown.
          </p>
        )}
        <p className="text-xs text-muted">
          {r.method} Computed {mode === "api" ? "by the API (shapely)" : "in the browser (static demo mode)"}.
        </p>
      </Section>

      <div className="mt-auto flex flex-wrap items-center gap-2.5 px-6 pb-6 pt-[18px]">
        <button type="button" className={btn.primary} onClick={onDownload}>
          <Icon.download />
          Download CSV
        </button>
        <button type="button" className={btn.secondary} onClick={onCompare}>
          Compare another area
        </button>
        <a href="/methodology" className="text-[13px]">
          How this is calculated
        </a>
      </div>
    </div>
  );
}
