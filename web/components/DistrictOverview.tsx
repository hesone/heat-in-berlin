import { formatEnergyPerYear, formatNumber, formatPower } from "@/lib/format";
import type { DistrictSummary } from "@/lib/district";
import { BAND_COLORS, BAND_SHORT } from "@/lib/legend";
import { EstimateChip, Icon, Section, StatCard, btn } from "./ui";

export function DistrictOverview({
  district,
  osmTimestamp,
  summary: s,
  onDraw,
}: {
  district: string;
  osmTimestamp: string;
  summary: DistrictSummary;
  onDraw: () => void;
}) {
  const max = Math.max(...s.hexesByBand.map((x) => x.count), 1);
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-col gap-1.5 border-b border-line-soft px-6 pb-4 pt-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{district} overview</h2>
          <EstimateChip>Estimates</EstimateChip>
        </div>
        <p className="text-[13px] text-muted">
          OSM data as of {new Date(osmTimestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>

      <Section id="District totals" className="grid grid-cols-2 gap-3">
        <StatCard label="Average heat density" value={formatNumber(s.avgDensity)} sub={`MWh/(ha·a) over ${formatNumber(s.areaHa)} ha`} />
        <StatCard label="Heat demand" value={formatEnergyPerYear(s.heatMwh * 1000)} sub={`${formatNumber(s.residential)} residential buildings`} />
        <StatCard label="Rooftop PV potential" value={formatPower(s.pvKwp)} sub={`all ${formatNumber(s.buildings)} buildings`} />
        <StatCard
          label="Floor counts from OSM"
          value={`${formatNumber(s.levelsFromOsmShare * 100)}%`}
          sub={`${formatNumber((1 - s.levelsFromOsmShare) * 100)}% use a type default`}
        />
      </Section>

      <Section id="dist-title" title="Hexagons by suitability band">
        <p className="mb-2.5 text-[12.5px] text-muted">{s.interiorHexes} hexagons fully inside the district</p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {s.hexesByBand.map(({ band, count }) => (
            <li key={band.id} className="grid grid-cols-[112px_1fr_28px] items-center gap-2.5 text-[12.5px]">
              <span>{BAND_SHORT[band.id]}</span>
              <span aria-hidden="true" className="h-3.5">
                <span
                  className="block h-full rounded-[3px] border border-[#5a5a5a]"
                  style={{ width: `${Math.max((count / max) * 100, count ? 4 : 0)}%`, background: BAND_COLORS[band.id], borderWidth: count ? 1 : 0 }}
                />
              </span>
              <span className="text-right font-mono">{count}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[12.5px] text-subtle">
          {s.edgeHexes} more hexagons are cut by the boundary and only count buildings inside {district}.
        </p>
      </Section>

      <div className="mt-auto flex flex-col gap-2.5 px-6 pb-6 pt-[18px]">
        <p className="text-[13px] text-subtle">Click a building or hexagon for its numbers, or draw your own area for a block-level answer.</p>
        <button type="button" className={`${btn.accent} self-start`} onClick={onDraw}>
          <Icon.polygon />
          Draw an area
        </button>
      </div>
    </div>
  );
}
