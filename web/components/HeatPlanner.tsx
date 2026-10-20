"use client";

import booleanWithin from "@turf/boolean-within";
import { useMutation, useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { buildingsInPolygon } from "@/lib/analysis";
import { analysisCsv } from "@/lib/csv";
import { analyseArea, fetchBuildings, fetchHexagons, fetchMeta, humaniseAnalysisError } from "@/lib/data";
import { districtSummary } from "@/lib/district";
import type { AnalysisResult, AreaGeometry, BuildingFeature } from "@/lib/types";
import { AnalysisPanel } from "./AnalysisPanel";
import { BuildingPanel } from "./BuildingPanel";
import { DistrictOverview } from "./DistrictOverview";
import { HexPopup } from "./HexPopup";
import { Legend } from "./Legend";
import { MapToolbar, ZoomControls } from "./MapControls";
import type { HexClick, MapApi } from "./MapView";
import { TopBar, type Layer } from "./TopBar";

const MapView = dynamic(() => import("./MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <p className="p-4 text-subtle">Loading map…</p>,
});

const overlay = "rounded-[10px] bg-white shadow-[0_2px_8px_rgba(16,24,40,0.16)]";

interface Area {
  polygon: AreaGeometry;
  title: string;
  outsideDistrict: boolean;
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function HeatPlanner() {
  const meta = useQuery({ queryKey: ["meta"], queryFn: fetchMeta });
  const bbox = meta.data?.data.bbox;
  const buildings = useQuery({ queryKey: ["buildings", bbox], queryFn: () => fetchBuildings(bbox!), enabled: !!bbox });
  const hexagons = useQuery({ queryKey: ["hexagons"], queryFn: fetchHexagons });

  const [layer, setLayer] = useState<Layer>("buildings");
  const [selected, setSelected] = useState<BuildingFeature | null>(null);
  const [hexSel, setHexSel] = useState<(HexClick & { left: number; top: number }) | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [area, setArea] = useState<Area | null>(null);
  const [previous, setPrevious] = useState<AnalysisResult | null>(null);
  // Phones: the details sheet starts collapsed so the district is visible; it opens on any selection.
  const [sheetOpen, setSheetOpen] = useState(() => typeof window === "undefined" || window.matchMedia("(min-width: 768px)").matches);
  const mapApi = useRef<MapApi | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const analysis = useMutation({
    mutationFn: (polygon: AreaGeometry) =>
      analyseArea(polygon, { mode: buildings.data!.mode, buildings: buildings.data!.data, meta: meta.data!.data }),
  });

  const runAnalysis = useCallback(
    (polygon: AreaGeometry, title: string) => {
      setDrawing(false);
      setSelected(null);
      setHexSel(null);
      const boundary = meta.data?.data.boundary;
      const outsideDistrict = boundary ? !booleanWithin({ type: "Feature", properties: {}, geometry: polygon }, boundary) : false;
      setArea({ polygon, title, outsideDistrict });
      setSheetOpen(true);
      analysis.mutate(polygon);
    },
    [analysis, meta.data],
  );
  const onPolygon = useCallback((g: AreaGeometry) => runAnalysis(g, "Drawn area"), [runAnalysis]);
  const onSelect = useCallback((f: BuildingFeature | null) => {
    setSelected(f);
    if (f) setSheetOpen(true);
  }, []);
  const onHexClick = useCallback((h: HexClick) => {
    setSheetOpen(false); // the popup carries the numbers; keep the map visible on phones
    const box = mainRef.current?.getBoundingClientRect();
    const w = box?.width ?? 800;
    const ht = box?.height ?? 600;
    setHexSel({ ...h, left: Math.min(Math.max(h.x + 14, 8), w - 268), top: Math.min(Math.max(h.y - 24, 72), ht - 300) });
  }, []);
  const onMoveStart = useCallback(() => setHexSel(null), []);

  const summary = useMemo(
    () => (meta.data && hexagons.data ? districtSummary(meta.data.data, hexagons.data.data) : null),
    [meta.data, hexagons.data],
  );

  if (meta.isError || buildings.isError || hexagons.isError) {
    return <p className="p-4">Could not load the map data. Please reload the page.</p>;
  }
  if (!meta.data || !buildings.data || !hexagons.data || !summary) {
    return <p className="p-4 text-subtle">Loading data…</p>;
  }
  const m = meta.data.data;
  const mode = buildings.data.mode;
  const bands = m.benchmarks.heat_density_bands;
  const hexFeature = hexSel ? hexagons.data.data.features.find((f) => f.properties.h3 === hexSel.h3) : undefined;

  function clearArea() {
    analysis.reset();
    setArea(null);
    setPrevious(null);
    setDrawing(false);
  }

  function compare() {
    if (analysis.data) setPrevious(analysis.data.data);
    analysis.reset();
    setArea(null);
    setDrawing(true);
  }

  function downloadCsv() {
    if (!area || !analysis.data) return;
    const inside = buildingsInPolygon(area.polygon, buildings.data!.data.features);
    const date = new Date().toISOString().slice(0, 10);
    download(`waerme-${m.district.toLowerCase()}-area-${date}.csv`, analysisCsv(analysis.data.data, inside, m.osm_timestamp));
  }

  let panel: React.ReactNode;
  if (analysis.isPending) {
    panel = (
      <p role="status" className="px-6 py-5 text-subtle">
        Analysing area…
      </p>
    );
  } else if (analysis.isError) {
    panel = (
      <div className="space-y-3 px-6 py-5">
        <p role="alert" className="font-semibold text-[#9b1c1c]">
          {humaniseAnalysisError(String((analysis.error as Error).message))}
        </p>
        <button type="button" className="underline" onClick={clearArea}>
          Clear and try again
        </button>
      </div>
    );
  } else if (analysis.data && area) {
    panel = (
      <AnalysisPanel
        result={analysis.data.data}
        previous={previous}
        bands={bands}
        mode={analysis.data.mode}
        title={area.title}
        outsideDistrict={area.outsideDistrict}
        district={m.district}
        onClear={clearArea}
        onDownload={downloadCsv}
        onCompare={compare}
      />
    );
  } else if (selected) {
    panel = <BuildingPanel building={selected.properties} benchmarks={m.benchmarks} onClose={() => setSelected(null)} />;
  } else {
    panel = (
      <DistrictOverview
        district={m.district}
        osmTimestamp={m.osm_timestamp}
        summary={summary}
        onDraw={() => {
          setLayer("buildings");
          setDrawing(true);
        }}
      />
    );
  }

  const legend = <Legend layer={layer} bands={bands} markerKwh={layer === "buildings" ? (selected?.properties.heat_kwh_a ?? null) : null} />;

  return (
    <div className="flex h-dvh flex-col bg-ground font-sans text-sm text-ink">
      <TopBar
        district={m.district}
        layer={layer}
        onLayer={(l) => {
          setLayer(l);
          setHexSel(null);
          if (l === "hexagons") setSelected(null);
        }}
        mode={mode}
        buildings={buildings.data.data.features}
        onSearchSelect={(f) => {
          setLayer("buildings");
          analysis.reset();
          setArea(null);
          setSelected(f);
          setSheetOpen(true);
          mapApi.current?.flyToBuilding(f);
        }}
      />
      <div className="relative flex min-h-0 flex-1">
        <main ref={mainRef} aria-label="Map" className="relative min-w-0 flex-1 overflow-hidden bg-[#f4f4f2]">
          <MapView
            meta={m}
            buildings={buildings.data.data}
            hexagons={hexagons.data.data}
            layer={layer}
            selectedId={selected ? Number(selected.id) : null}
            selectedHexId={hexFeature ? Number(hexFeature.id) : null}
            areaPolygon={area?.polygon ?? null}
            drawing={drawing}
            onSelect={onSelect}
            onHexClick={onHexClick}
            onPolygon={onPolygon}
            onMoveStart={onMoveStart}
            onReady={(api) => (mapApi.current = api)}
          />
          <div className="absolute left-3 right-16 top-3 flex flex-col items-start gap-2 md:left-4 md:top-4">
            <MapToolbar
              drawing={drawing}
              canClear={!!area || drawing}
              onDraw={() => {
                if (!drawing) {
                  setLayer("buildings");
                  setSelected(null);
                }
                setDrawing((d) => !d);
              }}
              onView={() => mapApi.current && runAnalysis(mapApi.current.getViewPolygon(), "Map view")}
              onClear={clearArea}
            />
            {drawing && (
              <p role="status" className={`${overlay} px-3 py-2 text-[13px]`}>
                Click to add corners; click the first corner again to finish.
                {previous && " Your previous result is kept for comparison."}
              </p>
            )}
          </div>
          <div className="absolute right-3 top-3 md:right-4 md:top-4">
            <ZoomControls
              onIn={() => mapApi.current?.zoomIn()}
              onOut={() => mapApi.current?.zoomOut()}
              onFit={() => mapApi.current?.fitDistrict()}
            />
          </div>
          <div className={`${overlay} absolute bottom-9 left-4 hidden w-[340px] max-w-[calc(100%-32px)] px-3.5 py-3 md:block`}>{legend}</div>
          {hexSel && hexFeature && (
            <HexPopup
              hex={hexFeature.properties}
              bands={bands}
              style={{ left: hexSel.left, top: hexSel.top }}
              onClose={() => setHexSel(null)}
              onAnalyse={() => runAnalysis(hexFeature.geometry, "Hexagon")}
            />
          )}
        </main>

        <aside
          aria-label="Details"
          className={`absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[18px] bg-white shadow-[0_-6px_24px_rgba(16,24,40,0.18)] md:static md:z-auto md:max-h-none md:w-[400px] md:shrink-0 md:rounded-none md:border-l md:border-line md:shadow-none ${
            sheetOpen ? "max-h-[58dvh]" : "max-h-[96px]"
          }`}
        >
          <button
            type="button"
            className="flex h-8 w-full shrink-0 items-center justify-center md:hidden"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen((o) => !o)}
          >
            <span aria-hidden="true" className="h-1 w-10 rounded-full bg-field" />
            <span className="sr-only">{sheetOpen ? "Collapse details" : "Expand details"}</span>
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {panel}
            <div className="border-t border-line-soft px-6 py-4 md:hidden">{legend}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
