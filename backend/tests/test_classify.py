import pytest

from waerme.classify import classify


@pytest.mark.parametrize(
    "tags,fp,levels,landuse,cat,basis",
    [
        ({"building": "apartments"}, 400, 5, None, "MFH", "osm_tag"),
        ({"building": "detached"}, 150, 2, None, "EFH", "osm_tag"),
        ({"building": "terrace"}, 90, 2, None, "RH", "osm_tag"),
        ({"building": "garage"}, 18, 1, "residential", "unheated", "osm_tag"),
        ({"building": "school"}, 2000, 3, None, "non_residential", "osm_tag"),
        ({"building": "yes", "shop": "bakery"}, 300, 4, "residential", "non_residential", "osm_tag"),
        ({"building": "yes"}, 20, None, "residential", "unheated", "landuse_heuristic"),
        ({"building": "yes"}, 180, 2, "residential", "EFH", "landuse_heuristic"),
        ({"building": "yes"}, 600, None, "residential", "MFH", "landuse_heuristic"),
        ({"building": "yes"}, 180, 5, "residential", "MFH", "landuse_heuristic"),
        ({"building": "yes"}, 600, None, None, "unknown", "none"),
        ({"building": "yes"}, 600, None, "allotments", "unheated", "landuse_heuristic"),
        ({"building": "yes"}, 900, None, "industrial", "non_residential", "landuse_heuristic"),
        ({"building": "stairs"}, 12, None, None, "unheated", "osm_tag"),
        ({"building": "mall"}, 9000, 3, None, "non_residential", "osm_tag"),
    ],
)
def test_classify(tags, fp, levels, landuse, cat, basis):
    c = classify(tags, fp, levels, landuse)
    assert (c.category, c.basis) == (cat, basis)
