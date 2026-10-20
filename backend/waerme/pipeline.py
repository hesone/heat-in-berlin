"""Raw Overpass JSON -> buildings.geojson, hexagons.geojson, meta.json."""

from __future__ import annotations

import datetime as dt
from collections import Counter

import h3
import shapely
from shapely.geometry import Polygon, mapping
from shapely.strtree import STRtree

from . import benchmarks as bm
from .classify import classify
from .estimation import estimate, parse_levels
from .geo import to_utm
from .osm import OsmFeature, parse

H3_RESOLUTION = 9
COORD_DECIMALS = 6  # ≈ 0.1 m


def _round_coords(obj):
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(obj[0], COORD_DECIMALS), round(obj[1], COORD_DECIMALS)]
        return [_round_coords(o) for o in obj]
    return obj


def _geojson_geom(geom) -> dict:
    m = mapping(geom)
    return {"type": m["type"], "coordinates": _round_coords(m["coordinates"])}


def _landuse_lookup(landuse: list[OsmFeature]):
    if not landuse:
        return lambda pt: None
    geoms = [f.geometry for f in landuse]
    tree = STRtree(geoms)

    def lookup(pt) -> str | None:
        hits = [i for i in tree.query(pt, predicate="within")]
        if not hits:
            return None
        smallest = min(hits, key=lambda i: geoms[i].area)  # most specific landuse wins
        return landuse[smallest].tags.get("landuse")

    return lookup


def coverage(buildings: list[OsmFeature]) -> dict:
    n = len(buildings)

    def share(key: str) -> dict:
        c = sum(1 for b in buildings if key in b.tags)
        return {"count": c, "share": round(c / n, 4) if n else 0}

    return {
        "building_elements": n,
        "tags": {k: share(k) for k in ("building:levels", "height", "roof:shape", "start_date", "addr:housenumber")},
        "building_values_top": Counter(b.tags.get("building") for b in buildings).most_common(20),
    }


def build(doc: dict, district: str, allow_pending: bool = False) -> tuple[dict, dict, dict]:
    boundary, buildings, landuse = parse(doc)
    shapely.prepare(boundary)
    lookup = _landuse_lookup(landuse)

    features: list[dict] = []
    counts: Counter[str] = Counter()
    level_src: Counter[str] = Counter()
    roof_src: Counter[str] = Counter()
    basis: Counter[str] = Counter()
    in_district = []
    for b in buildings:
        rp = b.geometry.representative_point()
        if not boundary.contains(rp):
            continue  # belongs to a neighbouring Ortsteil
        in_district.append(b)
        fp = to_utm(b.geometry).area
        lv, _ = parse_levels(b.tags)
        cls = classify(b.tags, fp, lv, lookup(rp))
        counts[cls.category] += 1
        if cls.category == "unheated":
            continue
        try:
            est = estimate(b.tags, cls.category, fp)
        except bm.PendingBenchmark:
            if not allow_pending:
                raise
            est = estimate(b.tags, cls.category, fp, with_heat=False)
        level_src[est.levels_source] += 1
        roof_src[est.roof_source] += 1
        basis[cls.basis] += 1
        c = b.geometry.centroid
        addr = " ".join(x for x in (b.tags.get("addr:street"), b.tags.get("addr:housenumber")) if x) or None
        features.append(
            {
                "type": "Feature",
                "id": len(features),
                "geometry": _geojson_geom(b.geometry),
                "properties": {
                    "osm": b.key,
                    "addr": addr,
                    "building": b.tags.get("building"),
                    "cat": cls.category,
                    "basis": cls.basis,
                    "fp_m2": round(est.footprint_m2),
                    "levels": est.levels,
                    "levels_src": est.levels_source,
                    "an_m2": round(est.a_n_m2),
                    "q_kwh_m2a": est.specific_heat_kwh_m2a,
                    "heat_kwh_a": None if est.heat_kwh_a is None else round(est.heat_kwh_a),
                    "roof": est.roof,
                    "roof_src": est.roof_source,
                    "pv_kwp": round(est.pv_kwp, 1),
                    "pv_kwh_a": round(est.pv_kwh_a),
                    "cx": round(c.x, COORD_DECIMALS),
                    "cy": round(c.y, COORD_DECIMALS),
                },
            }
        )

    hexes = aggregate_hex(features, boundary)
    totals_heat = sum(f["properties"]["heat_kwh_a"] or 0 for f in features)
    meta = {
        "district": district,
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "osm_timestamp": doc.get("osm3s", {}).get("timestamp_osm_base"),
        "attribution": "© OpenStreetMap contributors, ODbL 1.0",
        "district_area_ha": round(to_utm(boundary).area / 10_000, 1),
        "bbox": list(boundary.bounds),
        "coverage": coverage(in_district),
        "category_counts": dict(counts),
        "features_rendered": len(features),
        "with_heat_estimate": sum(1 for f in features if f["properties"]["heat_kwh_a"] is not None),
        "levels_source_counts": dict(level_src),
        "roof_source_counts": dict(roof_src),
        "classification_basis_counts": dict(basis),
        "totals": {
            "heat_mwh_a": round(totals_heat / 1000, 1),
            "pv_kwp": round(sum(f["properties"]["pv_kwp"] for f in features), 1),
        },
        "h3_resolution": H3_RESOLUTION,
        "heat_estimates_pending": allow_pending and any(c.value is None for c in bm.SPECIFIC_HEAT_DEMAND.values()),
        "benchmarks": bm.all_cited(),
    }
    boundary_fc = {"type": "Feature", "properties": {"name": district}, "geometry": _geojson_geom(boundary)}
    meta["boundary"] = boundary_fc
    return {"type": "FeatureCollection", "features": features}, hexes, meta


def aggregate_hex(features: list[dict], boundary) -> dict:
    cells: dict[str, dict] = {}
    for f in features:
        p = f["properties"]
        cell = h3.latlng_to_cell(p["cy"], p["cx"], H3_RESOLUTION)
        agg = cells.setdefault(cell, {"heat_kwh_a": 0.0, "pv_kwp": 0.0, "n": 0, "n_heat": 0})
        agg["n"] += 1
        agg["pv_kwp"] += p["pv_kwp"]
        if p["heat_kwh_a"] is not None:
            agg["heat_kwh_a"] += p["heat_kwh_a"]
            agg["n_heat"] += 1
    out = []
    for cell, agg in sorted(cells.items()):
        ring = [(lng, lat) for lat, lng in h3.cell_to_boundary(cell)]
        poly = Polygon(ring)
        area_ha = h3.cell_area(cell, unit="m^2") / 10_000
        heat_mwh = agg["heat_kwh_a"] / 1000
        out.append(
            {
                "type": "Feature",
                "id": int(cell, 16) % 2**31,
                "geometry": _geojson_geom(poly),
                "properties": {
                    "h3": cell,
                    "area_ha": round(area_ha, 2),
                    "heat_mwh_a": round(heat_mwh, 1),
                    "density_mwh_ha_a": round(heat_mwh / area_ha, 1),
                    "pv_kwp": round(agg["pv_kwp"], 1),
                    "buildings": agg["n"],
                    "buildings_with_heat_estimate": agg["n_heat"],
                    # cells cut by the district boundary only contain this district's buildings
                    "edge": not boundary.contains(poly),
                },
            }
        )
    return {"type": "FeatureCollection", "features": out}
