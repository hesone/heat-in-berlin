"""Endpoint tests against layers built from the synthetic fixture (not real OSM data)."""

import json

import pytest
from django.test import Client

from heat.store import get_store
from waerme.pipeline import build

from .conftest import LAT0, LON0


@pytest.fixture
def client(tmp_path, settings, synthetic_doc, test_heat_benchmarks):
    b, h, m = build(synthetic_doc, "Testdorf")
    for name, obj in {"buildings.geojson": b, "hexagons.geojson": h, "meta.json": m}.items():
        (tmp_path / name).write_text(json.dumps(obj))
    settings.DATA_DIR = tmp_path
    get_store.cache_clear()
    yield Client()
    get_store.cache_clear()


def square(lon, lat, d):
    return {
        "type": "Polygon",
        "coordinates": [[[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d], [lon, lat]]],
    }


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_buildings_bbox_filters(client):
    r = client.get("/api/buildings", {"bbox": f"{LON0},{LAT0},{LON0 + 0.0025},{LAT0 + 0.002}"})
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "FeatureCollection"
    assert {f["properties"]["osm"] for f in body["features"]} == {"w10", "w11"}


@pytest.mark.parametrize("bbox", [None, "1,2,3", "a,b,c,d", "13.3,52.5,13.2,52.6"])
def test_buildings_bad_bbox(client, bbox):
    params = {} if bbox is None else {"bbox": bbox}
    assert client.get("/api/buildings", params).status_code == 400


def test_analyse_returns_aggregates(client):
    r = client.post("/api/analyse", data=json.dumps(square(LON0, LAT0, 0.01)), content_type="application/json")
    assert r.status_code == 200
    body = r.json()
    assert body["buildings"] == 5
    assert body["indicative"] is True
    assert body["band"]["id"] in {"none", "new_build", "low_temp", "conventional", "very_high"}
    assert body["band_source"]["url"].startswith("https://")


def test_analyse_accepts_feature(client):
    feature = {"type": "Feature", "properties": {}, "geometry": square(LON0, LAT0, 0.01)}
    r = client.post("/api/analyse", data=json.dumps(feature), content_type="application/json")
    assert r.status_code == 200


@pytest.mark.parametrize("payload", [{}, {"type": "Point", "coordinates": [0, 0]}, [1, 2]])
def test_analyse_rejects_bad_payload(client, payload):
    r = client.post("/api/analyse", data=json.dumps(payload), content_type="application/json")
    assert r.status_code == 400 and "error" in r.json()


def test_analyse_get_not_allowed(client):
    assert client.get("/api/analyse").status_code == 405
