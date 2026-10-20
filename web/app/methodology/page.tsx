import type { Metadata } from "next";
import Link from "next/link";
import metaJson from "@/public/data/meta.json";
import { bandRangeLabel } from "@/lib/legend";
import type { Cited, Meta } from "@/lib/types";

export const metadata: Metadata = { title: "Methodology · Heat in Berlin" };

const meta = metaJson as unknown as Meta;
const bm = meta.benchmarks;

function Src({ c }: { c: Cited }) {
  const s = bm.sources[c.source];
  if (!s.url) return <span className="text-neutral-700">(project assumption)</span>;
  return (
    <a href={s.url} className="underline" target="_blank" rel="noreferrer">
      {s.title}
    </a>
  );
}

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)} %`;

export default function Methodology() {
  const total = meta.features_rendered;
  const lv = meta.levels_source_counts;
  const cov = (meta as unknown as { coverage: { building_elements: number; tags: Record<string, { count: number; share: number }> } }).coverage;
  const sh = bm.specific_heat_demand;
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6 leading-relaxed [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_table]:w-full [&_td]:border-b [&_td]:border-neutral-200 [&_td]:py-1 [&_td]:pr-3 [&_th]:border-b [&_th]:border-neutral-500 [&_th]:py-1 [&_th]:pr-3 [&_th]:text-left">
      <p>
        <Link href="/" className="underline">
          ← Back to the map
        </Link>
      </p>
      <h1 className="text-2xl font-bold">Methodology, sources and limitations</h1>
      <p className="rounded bg-amber-100 p-3 text-amber-950">
        Every number in this tool is an <strong>estimate</strong> derived from building geometry and published
        benchmark values. No metered consumption data is used. Results are indicative and do not replace a
        heat-planning study.
      </p>

      <section>
        <h2>Data and licences</h2>
        <ul className="list-disc pl-6">
          <li>
            Building footprints, floor counts, roof shapes and landuse: OpenStreetMap, extract for the Ortsteil{" "}
            {meta.district} (OSM data as of {meta.osm_timestamp}). © OpenStreetMap contributors, available under the{" "}
            <a className="underline" href="https://opendatacommons.org/licenses/odbl/">
              Open Database License (ODbL) 1.0
            </a>
            . The derived layers in this project are also ODbL.
          </li>
          <li>Basemap: OpenFreeMap (OpenMapTiles schema, OSM data); attribution is shown on the map.</li>
          <li>Benchmark values: the publications cited below. They are used here for their figures only.</li>
        </ul>
        <p>
          Of {cov.building_elements.toLocaleString("en-GB")} OSM buildings in the district,{" "}
          {cov.tags["building:levels"].count.toLocaleString("en-GB")} ({(cov.tags["building:levels"].share * 100).toFixed(1)} %)
          carry <code>building:levels</code>. After removing unheated structures, {total.toLocaleString("en-GB")} buildings are
          shown. Their floor count comes from <code>building:levels</code> for {pct(lv["osm:building:levels"] ?? 0, total)}, from{" "}
          <code>height</code> for {pct(lv["osm:height"] ?? 0, total)}, and is a type default for {pct(lv["default"] ?? 0, total)}.
        </p>
      </section>

      <section>
        <h2>1. Building type</h2>
        <p>
          The OSM <code>building</code> tag decides the type: e.g. <code>house</code>/<code>detached</code> → single-family
          house (EFH), <code>terrace</code> → terraced house (RH), <code>apartments</code> → apartment building (MFH). Garages,
          sheds, allotment huts, roofs/canopies and similar are removed. Generic tags (<code>yes</code>,{" "}
          <code>residential</code>) inside residential landuse are classified by footprint: under 30 m² ancillary (removed);
          under 250 m² and at most 3 floors EFH; otherwise MFH. These thresholds are project assumptions.
        </p>
      </section>

      <section>
        <h2>2. Heat demand (residential buildings only)</h2>
        <p className="rounded bg-neutral-100 p-3 font-mono text-sm">
          V_e = footprint × floors × {bm.storey_height.value} m
          <br />A_N = {bm.an_per_ve.value} × V_e
          <br />heat demand [kWh/a] = A_N × q
        </p>
        <ul className="list-disc pl-6">
          <li>
            A_N = 0.32 · V_e: <Src c={bm.an_per_ve} />. Storey height {bm.storey_height.value} m:{" "}
            <Src c={bm.storey_height} />; {bm.storey_height.note}.
          </li>
          <li>
            Missing floor counts: EFH/RH {bm.default_levels.EFH.value}, MFH {bm.default_levels.MFH.value}, others{" "}
            {bm.default_levels.other.value} floors (project assumption).
          </li>
          <li>
            q (kWh per m² A_N per year), heating + hot water: <Src c={sh.MFH} />, Anhang C.3 (PDF p. 113). The values used
            are heat generation for heating and hot water in the existing (unrenovated) state, calibrated to typical
            consumption level, averaged over age classes weighted by German living area (Tab. 4). They are converted from
            heated living area to A_N with the factor {bm.wohnflaeche_to_an_factor.value} (Kap. 5.4, p. 40).
          </li>
        </ul>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>q [kWh/(m² A_N·a)]</th>
              <th>IWU types averaged</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>EFH</td><td>{sh.EFH.value}</td><td>EFH A–J</td></tr>
            <tr><td>RH</td><td>{sh.RH.value}</td><td>RH B–J</td></tr>
            <tr><td>MFH</td><td>{sh.MFH.value}</td><td>MFH A–J, GMH B–F</td></tr>
          </tbody>
        </table>
        <p>Non-residential buildings and buildings of unknown use get no heat estimate; they are hatched on the map.</p>
      </section>

      <section>
        <h2>3. Rooftop PV potential</h2>
        <p className="rounded bg-neutral-100 p-3 font-mono text-sm">
          roof area = footprint / cos(slope)
          <br />module area = roof area × usable share × module share
          <br />kWp = module area × {bm.module_kwp_per_m2.value} kWp/m²; kWh/a = kWp × {bm.pv_specific_yield.value}
        </p>
        <table>
          <thead>
            <tr><th>Parameter</th><th>Flat roof</th><th>Pitched roof</th></tr>
          </thead>
          <tbody>
            <tr><td>Slope</td><td>{bm.roof_slope_deg.flat.value}°</td><td>{bm.roof_slope_deg.pitched.value}°</td></tr>
            <tr><td>Usable roof share</td><td>{bm.usable_roof_share.flat.value}</td><td>{bm.usable_roof_share.pitched.value}</td></tr>
            <tr><td>Module share of usable area</td><td>{bm.module_area_share.flat.value}</td><td>{bm.module_area_share.pitched.value}</td></tr>
          </tbody>
        </table>
        <p>
          Factors and the {bm.pv_min_footprint_m2.value} m² minimum footprint: <Src c={bm.module_kwp_per_m2} />. Specific yield{" "}
          {bm.pv_specific_yield.value} kWh/(kWp·a) is derived by this project from the Berlin-wide totals in the{" "}
          <Src c={bm.pv_specific_yield} /> ({bm.pv_specific_yield.note}). Roof shape comes from OSM{" "}
          <code>roof:shape</code> where tagged; otherwise EFH/RH are assumed pitched and all others flat.
        </p>
      </section>

      <section>
        <h2>4. Heat density and heat-network suitability</h2>
        <p>
          For a drawn area, a building counts if its centroid lies inside the polygon. Heat density = estimated heat
          demand of those buildings ÷ the polygon&apos;s gross area (including streets). The suitability bands are taken
          from <Src c={bm.heat_density_bands_source} />: {bm.heat_density_bands_source.note}.
        </p>
        <table>
          <thead>
            <tr><th>MWh/(ha·a)</th><th>Indicative suitability</th></tr>
          </thead>
          <tbody>
            {bm.heat_density_bands.map((b) => (
              <tr key={b.id}><td>{bandRangeLabel(b)}</td><td>{b.label}</td></tr>
            ))}
          </tbody>
        </table>
        <p>
          For comparison, Berlin&apos;s own Wärmeplan uses {bm.berlin_reference_threshold.value} MWh/(ha·a) as its
          network-suitability threshold (<Src c={bm.berlin_reference_threshold} />).
        </p>
        <p>
          The hexagon layer pre-aggregates the same values on an H3 grid (resolution {meta.h3_resolution}, about 10.5 ha per
          cell), assigning each building to the cell containing its centroid.
        </p>
      </section>

      <section>
        <h2>Known limitations</h2>
        <ul className="list-disc pl-6">
          <li>
            Building age is not known (only {(cov.tags["start_date"].share * 100).toFixed(1)} % of OSM buildings have{" "}
            <code>start_date</code>), so a German stock-average per type is used. Charlottenburg&apos;s stock is older than the
            German average, and many buildings have been renovated; both effects are not captured.
          </li>
          <li>
            The density bands refer to final energy (Endenergie). This tool uses heat generation (Wärmeerzeugung) for heating
            and hot water, which equals final energy only for district-heated buildings; for gas or oil boilers final energy
            is higher.
          </li>
          <li>Non-residential heat demand is not estimated, so area totals and densities are understated where such buildings are common.</li>
          <li>Mixed-use buildings tagged as apartments (shops on the ground floor) are treated as fully residential.</li>
          <li>
            {pct(lv["default"] ?? 0, total)} of buildings use an assumed floor count; the storey height is a single assumed value.
          </li>
          <li>
            PV ignores shading, roof orientation, dormers and structural suitability (the source study excludes 10–20 % of
            buildings as structurally unsuitable; this is not applied here).
          </li>
          <li>Hexagons cut by the district boundary only contain this district&apos;s buildings (dashed outline).</li>
          <li>OSM completeness and tagging quality vary; footprints may be missing, split or merged.</li>
        </ul>
      </section>

      <section>
        <h2>Reproducing the data</h2>
        <p>
          <code>backend/scripts/fetch_osm.py</code> downloads the extract from the Overpass API;{" "}
          <code>backend/scripts/build_layers.py</code> computes all values. Every constant lives in{" "}
          <code>backend/waerme/benchmarks.py</code> with its source; this page is generated from the same file via{" "}
          <code>meta.json</code> (built {meta.generated_at}).
        </p>
      </section>
    </main>
  );
}
