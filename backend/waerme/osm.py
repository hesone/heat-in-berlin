"""Turn a raw Overpass `out geom` response into shapely geometries."""

from __future__ import annotations

from dataclasses import dataclass, field

from shapely.geometry import LineString, MultiPolygon, Polygon
from shapely.geometry.base import BaseGeometry
from shapely.ops import linemerge, polygonize, unary_union
from shapely.validation import make_valid


@dataclass
class OsmFeature:
    osm_type: str  # "way" | "relation"
    osm_id: int
    tags: dict[str, str]
    geometry: BaseGeometry  # WGS84 lon/lat, (Multi)Polygon
    meta: dict = field(default_factory=dict)

    @property
    def key(self) -> str:
        return f"{self.osm_type[0]}{self.osm_id}"


def _coords(geom_list: list[dict]) -> list[tuple[float, float]]:
    return [(p["lon"], p["lat"]) for p in geom_list if p is not None]


def _clean(geom: BaseGeometry) -> BaseGeometry | None:
    if geom.is_empty:
        return None
    if not geom.is_valid:
        geom = make_valid(geom)
        polys = [g for g in getattr(geom, "geoms", [geom]) if isinstance(g, (Polygon, MultiPolygon))]
        if not polys:
            return None
        geom = unary_union(polys)
    return geom if isinstance(geom, (Polygon, MultiPolygon)) and not geom.is_empty else None


def way_polygon(el: dict) -> BaseGeometry | None:
    pts = _coords(el.get("geometry", []))
    if len(pts) < 4 or pts[0] != pts[-1]:
        return None
    return _clean(Polygon(pts))


def relation_polygon(el: dict) -> BaseGeometry | None:
    """Assemble a multipolygon relation (or boundary) from its member way geometries."""
    outer, inner = [], []
    for m in el.get("members", []):
        if m.get("type") != "way" or not m.get("geometry"):
            continue
        line = LineString(_coords(m["geometry"]))
        (inner if m.get("role") == "inner" else outer).append(line)
    if not outer:
        return None
    outer_polys = list(polygonize(linemerge(outer)))
    inner_polys = list(polygonize(linemerge(inner))) if inner else []
    if not outer_polys:
        return None
    geom = unary_union(outer_polys)
    if inner_polys:
        geom = geom.difference(unary_union(inner_polys))
    return _clean(geom)


def parse(doc: dict) -> tuple[BaseGeometry, list[OsmFeature], list[OsmFeature]]:
    """Return (district boundary, buildings, landuse areas)."""
    boundary = None
    buildings: list[OsmFeature] = []
    landuse: list[OsmFeature] = []
    for el in doc["elements"]:
        tags = el.get("tags", {})
        if el["type"] == "relation" and tags.get("boundary") == "administrative":
            boundary = relation_polygon(el)
            continue
        is_building = "building" in tags and tags["building"] != "no"
        is_landuse = "landuse" in tags
        if not (is_building or is_landuse):
            continue
        geom = way_polygon(el) if el["type"] == "way" else relation_polygon(el)
        if geom is None:
            continue
        feat = OsmFeature(el["type"], el["id"], tags, geom)
        if is_building:
            buildings.append(feat)
        elif is_landuse:
            landuse.append(feat)
    if boundary is None:
        raise ValueError("no administrative boundary relation in Overpass response")
    return boundary, buildings, landuse
