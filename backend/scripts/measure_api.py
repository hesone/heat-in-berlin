#!/usr/bin/env python3
"""Measure API response times against a running server (default http://127.0.0.1:8000).

    gunicorn config.wsgi -b 127.0.0.1:8000 -w 2 --preload   # in backend/
    python backend/scripts/measure_api.py [--base URL] [--n 50]

Prints median and p95 wall-clock time per request (new connection per request, after one warm-up).
"""

from __future__ import annotations

import argparse
import json
import platform
import statistics
import time
import urllib.request

POLYGON = {
    "type": "Polygon",
    "coordinates": [[[13.300, 52.505], [13.310, 52.505], [13.310, 52.512], [13.300, 52.512], [13.300, 52.505]]],
}


def timed(make_req, n: int) -> dict:
    urllib.request.urlopen(make_req()).read()  # warm-up
    xs, body = [], b""
    for _ in range(n):
        t0 = time.perf_counter()
        body = urllib.request.urlopen(make_req()).read()
        xs.append((time.perf_counter() - t0) * 1000)
    xs.sort()
    return {
        "n": n,
        "median_ms": round(statistics.median(xs), 1),
        "p95_ms": round(xs[int(0.95 * n) - 1], 1),
        "bytes": len(body),
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="http://127.0.0.1:8000")
    p.add_argument("--n", type=int, default=50)
    a = p.parse_args()
    b = a.base.rstrip("/")
    cases = {
        "GET /api/buildings, whole-district bbox": lambda: b + "/api/buildings?bbox=13.27,52.49,13.35,52.54",
        "GET /api/buildings, ~700 x 800 m bbox": lambda: b + "/api/buildings?bbox=13.300,52.505,13.310,52.512",
        "POST /api/analyse, 52.9 ha polygon": lambda: urllib.request.Request(
            b + "/api/analyse", data=json.dumps(POLYGON).encode(), headers={"Content-Type": "application/json"}
        ),
    }
    out = {"machine": f"{platform.system()} {platform.machine()}", "python": platform.python_version()}
    out |= {k: timed(v, a.n) for k, v in cases.items()}
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
