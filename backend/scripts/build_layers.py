#!/usr/bin/env python3
"""Build the precomputed layers from the committed raw OSM extract.

    python backend/scripts/build_layers.py [--district Schmargendorf]

Writes data/derived/{buildings,hexagons,meta}.json and copies them to web/public/data/
for the frontend's static demo mode.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from waerme import benchmarks as bm  # noqa: E402
from waerme.pipeline import build  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--district", default="Charlottenburg")
    p.add_argument(
        "--allow-pending",
        action="store_true",
        help="development only: build with heat fields empty while benchmark values are pending",
    )
    args = p.parse_args(argv)
    raw = ROOT / "data" / "raw" / f"{args.district.lower()}.overpass.json"
    if not raw.exists():
        print(f"{raw} missing; run backend/scripts/fetch_osm.py first", file=sys.stderr)
        return 1
    t0 = time.perf_counter()
    try:
        buildings, hexes, meta = build(json.loads(raw.read_text()), args.district, allow_pending=args.allow_pending)
    except bm.PendingBenchmark as exc:
        print(f"Refusing to build: {exc}", file=sys.stderr)
        return 2
    out = ROOT / "data" / "derived"
    out.mkdir(parents=True, exist_ok=True)
    files = {"buildings.geojson": buildings, "hexagons.geojson": hexes, "meta.json": meta}
    for name, obj in files.items():
        (out / name).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
    web = ROOT / "web" / "public" / "data"
    web.mkdir(parents=True, exist_ok=True)
    for name in files:
        shutil.copy2(out / name, web / name)
    print(
        f"Built in {time.perf_counter() - t0:.1f}s: {meta['features_rendered']} buildings, "
        f"{len(hexes['features'])} hexagons -> {out.relative_to(ROOT)}"
    )
    print(json.dumps({k: meta[k] for k in ("category_counts", "levels_source_counts", "roof_source_counts")}, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
