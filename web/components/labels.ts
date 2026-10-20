import type { BuildingProps, Category } from "@/lib/types";

export const CATEGORY_LABEL: Record<Category, string> = {
  EFH: "Single-family house (EFH)",
  RH: "Terraced house (RH)",
  MFH: "Apartment building (MFH)",
  non_residential: "Non-residential",
  unknown: "Unknown use",
};

export const BASIS_LABEL: Record<BuildingProps["basis"], string> = {
  osm_tag: "from the OSM building tag",
  landuse_heuristic: "inferred from residential landuse and footprint size (OSM tag is generic)",
  none: "OSM tag too generic to classify",
};

export function buildingTitle(p: Pick<BuildingProps, "addr" | "osm">): string {
  return p.addr ?? `Building ${p.osm}`;
}

export function osmUrl(osm: string): string {
  const type = osm.startsWith("r") ? "relation" : "way";
  return `https://www.openstreetmap.org/${type}/${osm.slice(1)}`;
}
