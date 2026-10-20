#!/usr/bin/env python3
"""Print OSM tag coverage for the raw extract (no estimates, no benchmarks needed)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

import shapely  # noqa: E402

from waerme.osm import parse  # noqa: E402
from waerme.pipeline import coverage  # noqa: E402

district = sys.argv[1] if len(sys.argv) > 1 else "Charlottenburg"
doc = json.loads((ROOT / "data" / "raw" / f"{district.lower()}.overpass.json").read_text())
boundary, buildings, landuse = parse(doc)
shapely.prepare(boundary)
inside = [b for b in buildings if boundary.contains(b.geometry.representative_point())]
print(
    json.dumps(
        {
            "osm_timestamp": doc.get("osm3s", {}).get("timestamp_osm_base"),
            "landuse_polygons": len(landuse),
            **coverage(inside),
        },
        indent=1,
        ensure_ascii=False,
    )
)
