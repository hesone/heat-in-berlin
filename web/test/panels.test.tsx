import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { BuildingPanel } from "@/components/BuildingPanel";
import { DistrictOverview } from "@/components/DistrictOverview";
import { HexPopup } from "@/components/HexPopup";
import { districtSummary } from "@/lib/district";
import type { AnalysisResult, BuildingProps, HexCollection } from "@/lib/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { META } from "./fixtures/meta";

const hexagons = JSON.parse(readFileSync(join(process.cwd(), "public/data/hexagons.geojson"), "utf8"));

const residential: BuildingProps = {
  osm: "w123", addr: null, building: "apartments", cat: "MFH", basis: "osm_tag",
  fp_m2: 400, levels: 5, levels_src: "osm:building:levels", an_m2: 1920, q_kwh_m2a: 134.5,
  heat_kwh_a: 258_240, roof: "flat", roof_src: "default", pv_kwp: 21.6, pv_kwh_a: 19_250, cx: 13.3, cy: 52.5,
};

describe("BuildingPanel", () => {
  it("shows the estimate as a calculation chain with the source of each step", () => {
    render(<BuildingPanel building={residential} benchmarks={META.benchmarks} onClose={() => {}} />);
    expect(screen.getByRole("heading", { name: "Building w123" })).toBeInTheDocument();
    expect(screen.getByText("Estimate")).toBeInTheDocument();
    expect(screen.getByText("400 m²")).toBeInTheDocument();
    expect(screen.getByText("measured")).toBeInTheDocument();
    expect(screen.getByText("from OSM")).toBeInTheDocument();
    expect(screen.getByText("6,000 m³")).toBeInTheDocument(); // 1,920 / 0.32
    expect(screen.getByText("1,920 m²")).toBeInTheDocument();
    expect(screen.getByText("134.5 kWh/m²a")).toBeInTheDocument();
    expect(screen.getByText("258 MWh/a")).toBeInTheDocument();
    expect(screen.getByText(/assumed, not in OSM/)).toBeInTheDocument();
  });

  it("flags assumed floors and says when heat is not estimated", () => {
    render(
      <BuildingPanel
        building={{ ...residential, cat: "non_residential", levels_src: "default", heat_kwh_a: null, q_kwh_m2a: null }}
        benchmarks={META.benchmarks}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("assumed")).toBeInTheDocument();
    expect(screen.getByText(/OSM has no floor count/)).toBeInTheDocument();
    expect(screen.getByText("Not estimated.")).toBeInTheDocument();
    expect(screen.queryByText("× Specific demand")).toBeNull();
  });

  it("has a keyboard-operable close button", async () => {
    const onClose = vi.fn();
    render(<BuildingPanel building={residential} benchmarks={META.benchmarks} onClose={onClose} />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Close building details" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});

const result: AnalysisResult = {
  area_ha: 52.86, buildings: 372, buildings_with_heat_estimate: 335, buildings_without_heat_estimate: 37,
  heat_mwh_a: 96_627.1, heat_density_mwh_ha_a: 1827.9, pv_kwp: 10_058.7, pv_mwh_a: 8962,
  band: META.benchmarks.heat_density_bands[4], band_source: { title: "Leitfaden Wärmeplanung", url: "https://example.org" },
  berlin_reference_threshold_mwh_ha_a: 400, indicative: true, method: "Centroid rule.",
};

describe("AnalysisPanel", () => {
  const props = { bands: META.benchmarks.heat_density_bands, mode: "static" as const, onClear: () => {}, onDownload: () => {}, onCompare: () => {} };

  it("leads with density and verdict, labelled indicative, with the cited source and Berlin threshold", () => {
    render(<AnalysisPanel result={result} previous={null} {...props} />);
    expect(screen.getByTestId("heat-density")).toHaveTextContent("1,828");
    expect(screen.getByTestId("band-label")).toHaveTextContent("Very high suitability");
    expect(screen.getByText("Indicative")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Leitfaden Wärmeplanung" })).toHaveAttribute("href", "https://example.org");
    expect(screen.getByText(/Berlin Wärmeplan threshold: 400/)).toBeInTheDocument();
    expect(screen.getByText("52.9 ha · 372 buildings")).toBeInTheDocument();
    expect(screen.getByText(/likely higher than shown/)).toBeInTheDocument();
    expect(screen.queryByTestId("comparison")).toBeNull();
  });

  it("warns when the area extends beyond the district", () => {
    const { rerender } = render(<AnalysisPanel result={result} previous={null} {...props} />);
    expect(screen.queryByTestId("outside-warning")).toBeNull();
    rerender(<AnalysisPanel result={result} previous={null} {...props} outsideDistrict district="Charlottenburg" />);
    expect(screen.getByTestId("outside-warning")).toHaveTextContent("outside Charlottenburg");
  });

  it("compares with the previous area", () => {
    render(<AnalysisPanel result={result} previous={{ ...result, heat_density_mwh_ha_a: 900, band: META.benchmarks.heat_density_bands[3] }} {...props} />);
    expect(screen.getByTestId("comparison")).toHaveTextContent("+928");
    expect(screen.getByTestId("comparison")).toHaveTextContent("denser");
  });

  it("wires download, compare and clear", async () => {
    const onDownload = vi.fn(), onCompare = vi.fn(), onClear = vi.fn();
    render(<AnalysisPanel result={result} previous={null} {...props} onDownload={onDownload} onCompare={onCompare} onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: /download csv/i }));
    await userEvent.click(screen.getByRole("button", { name: /compare another area/i }));
    await userEvent.click(screen.getByRole("button", { name: /clear area/i }));
    expect([onDownload, onCompare, onClear].every((f) => f.mock.calls.length === 1)).toBe(true);
  });
});

describe("DistrictOverview and HexPopup", () => {
  const summary = districtSummary(META, hexagons as unknown as HexCollection);

  it("summarises the district from meta and the hexagon layer", () => {
    expect(summary.interiorHexes + summary.edgeHexes).toBe((hexagons as unknown as HexCollection).features.length);
    expect(summary.hexesByBand.reduce((a, b) => a + b.count, 0)).toBe(summary.interiorHexes);
    render(<DistrictOverview district="Charlottenburg" osmTimestamp={META.osm_timestamp} summary={summary} onDraw={() => {}} />);
    expect(screen.getByRole("heading", { name: "Charlottenburg overview" })).toBeInTheDocument();
    expect(screen.getByText(`${summary.interiorHexes} hexagons fully inside the district`)).toBeInTheDocument();
  });

  it("shows a hexagon's density and band, and offers to analyse it", async () => {
    const hex = (hexagons as unknown as HexCollection).features.find((f) => f.properties.density_mwh_ha_a > 1050)!.properties;
    const onAnalyse = vi.fn();
    render(<HexPopup hex={hex} bands={META.benchmarks.heat_density_bands} style={{}} onAnalyse={onAnalyse} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: /hexagon/i })).toBeInTheDocument();
    expect(screen.getByText("Very high")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Analyse this hexagon" }));
    expect(onAnalyse).toHaveBeenCalledOnce();
  });
});
