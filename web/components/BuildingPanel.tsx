import { formatArea, formatEnergyPerYear, formatNumber, formatPower } from "@/lib/format";
import type { Benchmarks, BuildingProps } from "@/lib/types";
import { BASIS_LABEL, CATEGORY_LABEL, buildingTitle, osmUrl } from "./labels";
import { EstimateChip, Icon, Section, StatCard } from "./ui";

type Tag = { text: string; tone: "ok" | "warn" | "plain" };

function Step({ label, value, note, tag }: { label: string; value: string; note?: string; tag?: Tag }) {
  const tone = tag?.tone === "ok" ? "text-ok-fg" : tag?.tone === "warn" ? "text-warn-fg" : "text-muted";
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-b border-dashed border-line py-2.5 last:border-b-0">
      <span>{label}</span>
      <span className="text-right font-mono font-semibold">{value}</span>
      <span className="text-xs text-muted">{note}</span>
      <span className={`text-right text-xs font-semibold ${tone}`}>{tag?.text}</span>
    </li>
  );
}

export function BuildingPanel({
  building: p,
  benchmarks: bm,
  onClose,
}: {
  building: BuildingProps;
  benchmarks: Benchmarks;
  onClose: () => void;
}) {
  const storey = bm.storey_height.value ?? 0;
  const anPerVe = bm.an_per_ve.value ?? 0;
  const ve = anPerVe ? p.an_m2 / anPerVe : 0;
  const floorsTag: Tag =
    p.levels_src === "osm:building:levels"
      ? { text: "from OSM", tone: "ok" }
      : p.levels_src === "osm:height"
        ? { text: "from OSM height", tone: "ok" }
        : { text: "assumed", tone: "warn" };
  const floorsNote = {
    "osm:building:levels": "building:levels tag · storey height assumed",
    "osm:height": `OSM height ÷ ${storey} m · storey height assumed`,
    default: "OSM has no floor count or height: type default",
  }[p.levels_src];
  const estimated = p.heat_kwh_a !== null && p.q_kwh_m2a !== null;
  const minFp = bm.pv_min_footprint_m2.value ?? 0;
  const usable = bm.usable_roof_share[p.roof].value ?? 0;
  const moduleShare = bm.module_area_share[p.roof].value ?? 0;

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-col gap-2 border-b border-line-soft px-6 pb-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="building-title" className="text-lg font-semibold">
              {buildingTitle(p)}
            </h2>
            <p className="font-mono text-[12.5px] text-muted">
              OSM {p.osm.startsWith("r") ? "relation" : "way"} {p.osm.slice(1)}
            </p>
          </div>
          <button type="button" aria-label="Close building details" onClick={onClose} className="-mr-2.5 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-ground">
            <Icon.close />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex h-6 items-center rounded-full bg-chip px-2.5 text-xs font-semibold">{CATEGORY_LABEL[p.cat]}</span>
          <EstimateChip />
        </div>
        <p className="text-xs text-muted">
          Type {BASIS_LABEL[p.basis]} (building={p.building ?? "?"})
        </p>
      </div>

      <Section id="Key figures" className="grid grid-cols-2 gap-3">
        {estimated ? (
          <StatCard tone="heat" label="Heat demand" value={formatEnergyPerYear(p.heat_kwh_a!).replace(" MWh/a", "")} sub="MWh/a · heating + hot water" />
        ) : (
          <StatCard label="Heat demand" value="—" sub="not estimated for this use" />
        )}
        <StatCard
          tone="pv"
          label="Rooftop PV"
          value={p.pv_kwp > 0 ? formatPower(p.pv_kwp) : "None"}
          sub={p.pv_kwp > 0 ? `${formatEnergyPerYear(p.pv_kwh_a)} electricity` : `footprint under ${minFp} m²`}
        />
      </Section>

      <Section id="calc-title" title="How the heat demand was estimated">
        <ol className="m-0 list-none p-0">
          <Step label="Footprint" value={formatArea(p.fp_m2)} note="OSM outline, EPSG:25833" tag={{ text: "measured", tone: "ok" }} />
          <Step label={`× Floors × ${storey} m storey height`} value={`${formatNumber(p.levels, 1)} floors`} note={floorsNote} tag={floorsTag} />
          <Step label="= Gross volume V_e" value={`${formatNumber(ve)} m³`} />
          <Step label={`× ${anPerVe} = Heated area A_N`} value={formatArea(p.an_m2)} note="ifeu Wärmeatlas method" />
          {estimated ? (
            <Step
              label="× Specific demand"
              value={`${formatNumber(p.q_kwh_m2a!, 1)} kWh/m²a`}
              note={`IWU typology, ${p.cat} stock average`}
              tag={{ text: "benchmark", tone: "warn" }}
            />
          ) : null}
        </ol>
        {estimated ? (
          <p className="mt-2.5 flex justify-between rounded-lg bg-ground px-3 py-2.5 font-semibold">
            <span>= Heat demand</span>
            <span className="font-mono">{formatEnergyPerYear(p.heat_kwh_a!)}</span>
          </p>
        ) : (
          <p className="mt-2.5 rounded-lg bg-ground px-3 py-2.5 text-sm">
            <strong>Not estimated.</strong> The IWU typology covers residential buildings only; this building is{" "}
            {p.cat === "unknown" ? "of unknown use" : "non-residential"}.
          </p>
        )}
      </Section>

      <Section id="pv-title" title="Rooftop PV basis">
        {p.pv_kwp > 0 ? (
          <p className="text-subtle">
            {p.roof === "flat" ? "Flat" : "Pitched"} roof{" "}
            {p.roof_src === "default" ? <span className="font-semibold text-warn-fg">(assumed, not in OSM)</span> : <span className="font-semibold text-ok-fg">(from OSM)</span>} ·{" "}
            {formatNumber(usable * 100)}% usable · {formatNumber(moduleShare * 100)}% module cover · {bm.module_kwp_per_m2.value} kWp/m² ·{" "}
            {formatNumber(bm.pv_specific_yield.value ?? 0)} kWh/kWp·a
          </p>
        ) : (
          <p className="text-subtle">Footprint under {minFp} m² is treated as too small for PV.</p>
        )}
        <p className="mt-1.5 text-xs text-muted">Factors: greenventory for Agora Energiewende (2023)</p>
      </Section>

      <div className="mt-auto flex flex-wrap gap-4 px-6 pb-6 pt-4 text-sm font-medium">
        <a href={osmUrl(p.osm)} target="_blank" rel="noreferrer">
          View on OpenStreetMap
        </a>
        <a href="/methodology">Methodology and sources</a>
      </div>
    </div>
  );
}
