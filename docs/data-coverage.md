# Data coverage (measured)

Extract: `data/raw/charlottenburg.overpass.json`, OSM base timestamp **2026-10-20T18:06:39Z**,
fetched by Hesam with `backend/scripts/fetch_osm.py --district Charlottenburg`.
Numbers below come from `backend/scripts/coverage.py` and `backend/scripts/build_layers.py`
run on that file. Re-run both scripts to reproduce them.

| Measure | Value |
|---|---|
| District area (OSM boundary, EPSG:25833) | 1,056.4 ha |
| Building elements whose representative point is inside the boundary | 5,660 |
| … with `building:levels` | 3,487 (61.6%) |
| … with `height` | 137 (2.4%) |
| … with `roof:shape` | 1,371 (24.2%) |
| … with `start_date` | 72 (1.3%), too sparse for age classes |
| Landuse polygons in extract | 999 |

After classification (`build_layers.py`):

| Category | Buildings |
|---|---|
| MFH (estimated) | 3,335 |
| EFH (estimated) | 531 |
| non-residential (PV only) | 941 |
| unknown (PV only) | 78 |
| unheated (dropped) | 775 |
| **rendered on the map** | **4,885** |

Of the rendered buildings, floors come from `building:levels` for 3,358, from `height` for 9, and from the
type default for 1,518. Roof shape comes from OSM for 801; the other 4,084 use the default.
Classification basis: OSM tag 3,250, landuse heuristic 1,557, none 78.
