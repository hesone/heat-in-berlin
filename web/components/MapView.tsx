"use client";

import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MlMap, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { TerraDraw, TerraDrawPolygonMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { BAND_COLORS, HEAT_CLASSES, NOT_ESTIMATED_COLOR } from "@/lib/legend";
import type { AreaGeometry, Band, BuildingCollection, BuildingFeature, HexCollection, Meta } from "@/lib/types";

maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs"); // copied by scripts/copy-maplibre-worker.mjs

const BASEMAP = process.env.NEXT_PUBLIC_BASEMAP_STYLE ?? "https://tiles.openfreemap.org/styles/positron";
const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#f4f4f2" } }],
};
const ACCENT = "#1d4ed8";
const EMPTY = { type: "FeatureCollection" as const, features: [] };

export interface MapApi {
  getViewPolygon: () => AreaGeometry;
  flyToBuilding: (f: BuildingFeature) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitDistrict: () => void;
}

export interface HexClick {
  h3: string;
  x: number;
  y: number;
}

declare global {
  interface Window {
    __waermeMap?: MlMap;
    __waermeMetrics?: { firstRenderMs: number; buildings: number };
  }
}

function hatchImage(size = 8): { width: number; height: number; data: Uint8Array } {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = (x + y) % size === 0 ? 0x6b : 0xd9;
      data.set([v, v, v, 255], (y * size + x) * 4);
    }
  }
  return { width: size, height: size, data };
}

function heatColorExpression() {
  const steps: (string | number)[] = [HEAT_CLASSES[0].color];
  for (const c of HEAT_CLASSES.slice(1)) steps.push(c.min, c.color);
  return [
    "case",
    ["==", ["get", "heat_kwh_a"], null],
    NOT_ESTIMATED_COLOR,
    ["step", ["/", ["get", "heat_kwh_a"], 1000], ...steps],
  ] as unknown as maplibregl.ExpressionSpecification;
}

function bandColorExpression(bands: Band[]) {
  const steps: (string | number)[] = [BAND_COLORS[bands[0].id]];
  for (const b of bands.slice(1)) steps.push(b.min, BAND_COLORS[b.id]);
  return ["step", ["get", "density_mwh_ha_a"], ...steps] as unknown as maplibregl.ExpressionSpecification;
}

const selectedExpr = (on: unknown, off: unknown) =>
  ["case", ["boolean", ["feature-state", "selected"], false], on, off] as unknown as maplibregl.ExpressionSpecification;

export function MapView({
  meta,
  buildings,
  hexagons,
  layer,
  selectedId,
  selectedHexId,
  areaPolygon,
  drawing,
  onSelect,
  onHexClick,
  onPolygon,
  onMoveStart,
  onReady,
}: {
  meta: Meta;
  buildings: BuildingCollection;
  hexagons: HexCollection;
  layer: "buildings" | "hexagons";
  selectedId: number | null;
  selectedHexId: number | null;
  areaPolygon: AreaGeometry | null;
  drawing: boolean;
  onSelect: (f: BuildingFeature | null) => void;
  onHexClick: (h: HexClick) => void;
  onPolygon: (g: AreaGeometry) => void;
  onMoveStart: () => void;
  onReady: (api: MapApi) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const prevSelected = useRef<number | null>(null);
  const prevHex = useRef<number | null>(null);
  const handlers = useRef({ onSelect, onPolygon, onHexClick, onMoveStart, drawing, layer });
  useEffect(() => {
    handlers.current = { onSelect, onPolygon, onHexClick, onMoveStart, drawing, layer };
  }, [onSelect, onPolygon, onHexClick, onMoveStart, drawing, layer]);
  const [loaded, setLoaded] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: BASEMAP === "none" ? BLANK_STYLE : BASEMAP,
      bounds: meta.bbox,
      fitBoundsOptions: { padding: 24 },
      attributionControl: false,
    });
    map.addControl(
      new maplibregl.AttributionControl({
        compact: false,
        customAttribution: `Buildings <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a> (ODbL)`,
      }),
      "bottom-right",
    );
    map.getCanvas().setAttribute("aria-label", "Map. Use arrow keys to pan; press Enter to select the building under the crosshair.");
    window.__waermeMap = map;
    mapRef.current = map;

    map.on("load", () => {
      map.addImage("hatch", hatchImage());
      map.addSource("boundary", { type: "geojson", data: meta.boundary });
      map.addSource("buildings", { type: "geojson", data: EMPTY });
      map.addSource("hexagons", { type: "geojson", data: EMPTY });
      map.addSource("area", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "hex-fill",
        type: "fill",
        source: "hexagons",
        layout: { visibility: "none" },
        paint: { "fill-color": bandColorExpression(meta.benchmarks.heat_density_bands), "fill-opacity": 0.82 },
      });
      map.addLayer({
        id: "hex-outline",
        type: "line",
        source: "hexagons",
        layout: { visibility: "none" },
        filter: ["==", ["get", "edge"], false],
        paint: { "line-color": "#333", "line-width": 0.5 },
      });
      map.addLayer({
        id: "hex-outline-edge",
        type: "line",
        source: "hexagons",
        layout: { visibility: "none" },
        filter: ["==", ["get", "edge"], true],
        paint: { "line-color": "#333", "line-width": 1, "line-dasharray": [2, 2] },
      });
      map.addLayer({
        id: "hex-selected",
        type: "line",
        source: "hexagons",
        layout: { visibility: "none" },
        paint: { "line-color": "#1b1f24", "line-width": selectedExpr(3, 0) },
      });
      map.addLayer({ id: "buildings-fill", type: "fill", source: "buildings", paint: { "fill-color": heatColorExpression(), "fill-opacity": 0.9 } });
      map.addLayer({
        id: "buildings-hatch",
        type: "fill",
        source: "buildings",
        filter: ["==", ["get", "heat_kwh_a"], null],
        paint: { "fill-pattern": "hatch" },
      });
      map.addLayer({
        id: "buildings-outline",
        type: "line",
        source: "buildings",
        paint: { "line-color": selectedExpr("#1b1f24", "#5a5a5a"), "line-width": selectedExpr(3, 0.4) },
      });
      map.addLayer({ id: "boundary-line", type: "line", source: "boundary", paint: { "line-color": "#1b1f24", "line-width": 2, "line-dasharray": [4, 2] } });
      map.addLayer({ id: "area-fill", type: "fill", source: "area", paint: { "fill-color": ACCENT, "fill-opacity": 0.1 } });
      map.addLayer({ id: "area-line", type: "line", source: "area", paint: { "line-color": ACCENT, "line-width": 3 } });

      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          new TerraDrawPolygonMode({
            styles: { fillColor: ACCENT, fillOpacity: 0.12, outlineColor: ACCENT, outlineWidth: 3, closingPointColor: ACCENT },
          }),
        ],
      });
      draw.start();
      draw.on("finish", (id) => {
        const f = draw.getSnapshotFeature(id);
        draw.setMode("static");
        draw.clear(); // the finished polygon is shown by the "area" layer instead
        if (f && f.geometry.type === "Polygon") handlers.current.onPolygon(f.geometry as AreaGeometry);
      });
      drawRef.current = draw;
      setLoaded(true);
    });

    map.on("click", "buildings-fill", (e) => {
      if (handlers.current.drawing || handlers.current.layer !== "buildings") return;
      const f = e.features?.[0];
      if (f) handlers.current.onSelect(f as unknown as BuildingFeature);
    });
    map.on("click", "hex-fill", (e) => {
      if (handlers.current.drawing || handlers.current.layer !== "hexagons") return;
      const f = e.features?.[0];
      if (f) handlers.current.onHexClick({ h3: String(f.properties.h3), x: e.point.x, y: e.point.y });
    });
    for (const id of ["buildings-fill", "hex-fill"]) {
      map.on("mouseenter", id, () => {
        if (!handlers.current.drawing) map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", id, () => {
        map.getCanvas().style.cursor = "";
      });
    }
    map.on("movestart", () => handlers.current.onMoveStart());

    onReady({
      getViewPolygon: () => {
        const b = map.getBounds();
        const [w, s, e, n] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
        return { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] };
      },
      flyToBuilding: (f) => map.flyTo({ center: [f.properties.cx, f.properties.cy], zoom: Math.max(map.getZoom(), 17) }),
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      fitDistrict: () => map.fitBounds(meta.bbox, { padding: 24 }),
    });

    return () => {
      drawRef.current?.stop();
      drawRef.current = null;
      map.remove();
      mapRef.current = null;
      delete window.__waermeMap;
    };
    // meta is stable for the page lifetime; onReady is called once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Data -> sources. Record time to first rendered frame with buildings.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    (map.getSource("buildings") as GeoJSONSource).setData(buildings);
    (map.getSource("hexagons") as GeoJSONSource).setData(hexagons);
    if (!window.__waermeMetrics) {
      map.once("idle", () => {
        performance.mark("waerme:first-map-render");
        window.__waermeMetrics = { firstRenderMs: Math.round(performance.now()), buildings: buildings.features.length };
      });
    }
  }, [loaded, buildings, hexagons]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    (map.getSource("area") as GeoJSONSource).setData(
      areaPolygon ? { type: "Feature", properties: {}, geometry: areaPolygon } : EMPTY,
    );
  }, [areaPolygon, loaded]);

  // Layer toggle.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const hex = layer === "hexagons" ? "visible" : "none";
    const bld = layer === "buildings" ? "visible" : "none";
    for (const id of ["hex-fill", "hex-outline", "hex-outline-edge", "hex-selected"]) map.setLayoutProperty(id, "visibility", hex);
    for (const id of ["buildings-fill", "buildings-hatch", "buildings-outline"]) map.setLayoutProperty(id, "visibility", bld);
  }, [layer, loaded]);

  // Selection highlights.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (prevSelected.current !== null) map.setFeatureState({ source: "buildings", id: prevSelected.current }, { selected: false });
    if (selectedId !== null) map.setFeatureState({ source: "buildings", id: selectedId }, { selected: true });
    prevSelected.current = selectedId;
  }, [selectedId, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    if (prevHex.current !== null) map.setFeatureState({ source: "hexagons", id: prevHex.current }, { selected: false });
    if (selectedHexId !== null) map.setFeatureState({ source: "hexagons", id: selectedHexId }, { selected: true });
    prevHex.current = selectedHexId;
  }, [selectedHexId, loaded]);

  // Drawing mode.
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !loaded) return;
    if (drawing) {
      draw.clear();
      draw.setMode("polygon");
    } else if (draw.getMode() === "polygon") {
      draw.clear();
      draw.setMode("static");
    }
  }, [drawing, loaded]);

  function selectAtCentre() {
    const map = mapRef.current;
    if (!map) return;
    const c = map.project(map.getCenter());
    const hits = map.queryRenderedFeatures([c.x, c.y], { layers: ["buildings-fill"] });
    onSelect(hits[0] ? (hits[0] as unknown as BuildingFeature) : null);
  }

  return (
    <div className="absolute inset-0">
      <div
        ref={container}
        className="h-full w-full"
        data-testid="map"
        onFocus={(e) => {
          if (e.target instanceof HTMLCanvasElement) setKeyboardFocus(e.target.matches(":focus-visible"));
        }}
        onBlur={() => setKeyboardFocus(false)}
        onKeyDown={(e) => {
          if (e.target instanceof HTMLCanvasElement && (e.key === "Enter" || e.key === " ") && layer === "buildings" && !drawing) {
            e.preventDefault();
            selectAtCentre();
          }
        }}
      />
      {keyboardFocus && (
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-8 w-8 rounded-full border-2 border-ink bg-white/30 shadow-[0_0_0_2px_white]" />
        </div>
      )}
    </div>
  );
}
