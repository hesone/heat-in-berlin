#!/usr/bin/env python3
"""Fetch OSM building footprints for one Berlin Ortsteil from the Overpass API.

Standard library only, so it runs with a bare `python3`:

    python3 backend/scripts/fetch_osm.py                     # Charlottenburg (default)
    python3 backend/scripts/fetch_osm.py --district Schmargendorf

Fetches buildings plus landuse polygons (landuse is used to classify the many
footprints tagged only building=yes). Writes the raw Overpass response unchanged to data/raw/<district>.overpass.json.
That file is committed: every later step (estimates, layers, tests) runs from it
offline. Data © OpenStreetMap contributors, ODbL 1.0.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ENDPOINT = "https://overpass-api.de/api/interpreter"

# Restrict to Berlin first: Ortsteil names are not unique (e.g. a Schmargendorf also exists in Brandenburg).
QUERY = """
[out:json][timeout:180];
area["boundary"="administrative"]["admin_level"="4"]["name"="Berlin"]->.berlin;
rel(area.berlin)["boundary"="administrative"]["admin_level"="10"]["name"="{district}"]->.b;
.b out geom;
.b map_to_area->.district;
(
  way["building"](area.district);
  rel["building"]["type"="multipolygon"](area.district);
  way["landuse"](area.district);
  rel["landuse"]["type"="multipolygon"](area.district);
);
out tags geom;
"""


def build_query(district: str) -> str:
    return QUERY.format(district=district)


def fetch(query: str, endpoint: str) -> bytes:
    body = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(
        endpoint,
        data=body,
        headers={"User-Agent": "waerme-berlin-dataprep/0.1 (portfolio project)"},
    )
    with urllib.request.urlopen(req, timeout=240) as resp:
        return resp.read()


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--district", default="Charlottenburg")
    p.add_argument("--endpoint", default=DEFAULT_ENDPOINT)
    args = p.parse_args(argv)

    out = ROOT / "data" / "raw" / f"{args.district.lower()}.overpass.json"
    out.parent.mkdir(parents=True, exist_ok=True)

    t0 = time.perf_counter()
    raw = fetch(build_query(args.district), args.endpoint)
    elapsed = time.perf_counter() - t0
    doc = json.loads(raw)

    boundaries = [
        e for e in doc["elements"] if e["type"] == "relation" and e.get("tags", {}).get("boundary") == "administrative"
    ]
    if len(boundaries) != 1:
        print(f"Expected exactly 1 boundary relation for {args.district!r}, got {len(boundaries)}", file=sys.stderr)
        return 1

    out.write_bytes(raw)
    buildings = [e for e in doc["elements"] if "building" in e.get("tags", {})]
    print(f"Saved {out.relative_to(ROOT)} ({len(raw) / 1e6:.1f} MB) in {elapsed:.1f}s")
    print(f"OSM base timestamp: {doc.get('osm3s', {}).get('timestamp_osm_base')}")
    print(f"Building elements: {len(buildings)}")
    print("Next: python3 backend/scripts/coverage.py  (prints tag coverage)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
