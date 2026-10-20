import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type Category = "EFH" | "RH" | "MFH" | "non_residential" | "unknown";

export interface BuildingProps {
  osm: string;
  addr: string | null;
  building: string | null;
  cat: Category;
  basis: "osm_tag" | "landuse_heuristic" | "none";
  fp_m2: number;
  levels: number;
  levels_src: "osm:building:levels" | "osm:height" | "default";
  an_m2: number;
  q_kwh_m2a: number | null;
  heat_kwh_a: number | null;
  roof: "flat" | "pitched";
  roof_src: "osm:roof:shape" | "default";
  pv_kwp: number;
  pv_kwh_a: number;
  cx: number;
  cy: number;
}

export type AreaGeometry = Polygon | MultiPolygon;
export type BuildingFeature = Feature<AreaGeometry, BuildingProps>;
export type BuildingCollection = FeatureCollection<AreaGeometry, BuildingProps>;

export interface HexProps {
  h3: string;
  area_ha: number;
  heat_mwh_a: number;
  density_mwh_ha_a: number;
  pv_kwp: number;
  buildings: number;
  buildings_with_heat_estimate: number;
  edge: boolean;
}
export type HexCollection = FeatureCollection<Polygon, HexProps>;

export interface Cited {
  value: number | null;
  unit: string;
  source: string;
  note: string;
  derived: boolean;
  verified: boolean;
}

export interface Band {
  id: "none" | "new_build" | "low_temp" | "conventional" | "very_high";
  label: string;
  min: number;
  max: number | null;
}

export interface Benchmarks {
  sources: Record<string, { title: string; url: string }>;
  storey_height: Cited;
  an_per_ve: Cited;
  default_levels: Record<string, Cited>;
  specific_heat_demand: Record<"EFH" | "RH" | "MFH", Cited>;
  wohnflaeche_to_an_factor: Cited;
  pv_min_footprint_m2: Cited;
  roof_slope_deg: Record<"flat" | "pitched", Cited>;
  usable_roof_share: Record<"flat" | "pitched", Cited>;
  module_area_share: Record<"flat" | "pitched", Cited>;
  module_kwp_per_m2: Cited;
  pv_specific_yield: Cited;
  heat_density_bands: Band[];
  heat_density_bands_source: Cited;
  berlin_reference_threshold: Cited;
}

export interface Meta {
  district: string;
  generated_at: string;
  osm_timestamp: string;
  attribution: string;
  district_area_ha: number;
  bbox: [number, number, number, number];
  features_rendered: number;
  with_heat_estimate: number;
  category_counts: Record<string, number>;
  levels_source_counts: Record<string, number>;
  roof_source_counts: Record<string, number>;
  totals: { heat_mwh_a: number; pv_kwp: number };
  h3_resolution: number;
  heat_estimates_pending: boolean;
  benchmarks: Benchmarks;
  boundary: Feature<AreaGeometry>;
}

export interface AnalysisResult {
  area_ha: number;
  buildings: number;
  buildings_with_heat_estimate: number;
  buildings_without_heat_estimate: number;
  heat_mwh_a: number;
  heat_density_mwh_ha_a: number;
  pv_kwp: number;
  pv_mwh_a: number;
  band: Band;
  band_source: { title: string; url: string };
  berlin_reference_threshold_mwh_ha_a: number | null;
  indicative: true;
  method: string;
}

export type DataMode = "api" | "static";
