from __future__ import annotations

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response

from waerme.analysis import AnalysisError, analyse, parse_polygon

from .store import get_store


def _parse_bbox(raw: str) -> tuple[float, float, float, float]:
    parts = [float(p) for p in raw.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox needs 4 numbers")
    minx, miny, maxx, maxy = parts
    if not (-180 <= minx < maxx <= 180 and -90 <= miny < maxy <= 90):
        raise ValueError("bbox must be minLon,minLat,maxLon,maxLat with min < max")
    return minx, miny, maxx, maxy


@api_view(["GET"])
def health(_request: Request) -> Response:
    return Response({"status": "ok"})


@api_view(["GET"])
def meta(_request: Request) -> Response:
    return Response(get_store().meta)


@api_view(["GET"])
def buildings(request: Request) -> Response:
    """GeoJSON FeatureCollection of buildings intersecting ?bbox=minLon,minLat,maxLon,maxLat."""
    raw = request.query_params.get("bbox")
    if raw is None:
        return Response({"error": "bbox query parameter is required (minLon,minLat,maxLon,maxLat)"}, status=400)
    try:
        bbox = _parse_bbox(raw)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)
    feats = get_store().buildings_in_bbox(bbox)
    return Response({"type": "FeatureCollection", "features": feats})


@api_view(["GET"])
def hexagons(_request: Request) -> Response:
    return Response(get_store().hexagons)


@api_view(["POST"])
def analyse_area(request: Request) -> Response:
    """Body: a GeoJSON Polygon/MultiPolygon geometry or Feature. Returns indicative aggregates."""
    try:
        poly = parse_polygon(request.data if isinstance(request.data, dict) else {})
        return Response(analyse(poly, get_store().index))
    except AnalysisError as exc:
        return Response({"error": str(exc)}, status=400)
