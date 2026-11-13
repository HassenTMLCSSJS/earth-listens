from pathlib import Path
from urllib.parse import parse_qs, urlparse

import numpy as np

from earth_pipeline.derive import quantize
from earth_pipeline.gibs import (
    check_budget,
    decode_image,
    lightning_seasons,
    parse_colormap,
    region_mean,
    resample_block_mean,
    wms_url,
)
from earth_pipeline.gibs_catalog import CONFIRMED
from earth_pipeline.svs import page, refuse_large

FIXTURES = Path(__file__).parent / "fixtures" / "recorded"


def test_sst_colormap_is_exact():
    xml = (FIXTURES / "GHRSST_Sea_Surface_Temperature.xml").read_text(encoding="utf-8")
    entries, units = parse_colormap(xml)
    assert "C" in units
    values, rate, opaque = decode_image(str(FIXTURES / "sst-2024-08-15.png"), entries)
    assert rate == 1
    assert opaque == 76301
    mean = region_mean(values, (-180, -90, 180, 90))
    assert mean is not None
    assert 18 < mean < 23


def test_lightning_calendar_has_18_unfilled_windows():
    seasons = lightning_seasons()
    assert len(seasons) == 18
    assert seasons[0]["id"] == "2017-MAM"
    assert seasons[-1]["id"] == "2021-JJA"
    assert all(len(item["days"]) == 10 and item["n_days"] is None for item in seasons)


def test_budget_fails_when_a_file_is_too_big():
    check_budget("value-texture", 1000)
    try:
        check_budget("value-texture", 400_000)
    except ValueError as error:
        assert "budget" in str(error)
    else:
        raise AssertionError("expected a budget failure")


def test_resample_matches_a_constant_grid():
    grid = np.full((8, 8), 4.0)
    out = resample_block_mean(grid, 2, 2)
    assert out.shape == (2, 2)
    assert out[0, 0] == 4


def test_single_value_colormap_entries_decode():
    xml = """<ColorMap units="%"><ColorMapEntry rgb="1,2,3" transparent="false" sourceValue="40" value="40" ref="1"/>
      <ColorMapEntry rgb="4,5,6" transparent="false" sourceValue="[1]" ref="2"/>
      <ColorMapEntry rgb="7,8,9" transparent="false" sourceValue="[20,+INF]" ref="3"/></ColorMap>"""
    entries, units = parse_colormap(xml)
    assert units == "%"
    assert entries[0].mid == 40
    assert entries[0].nodata is False
    assert entries[1].mid == 1
    assert entries[2].mid == 20
    assert entries[2].estimated is True


def test_wms_puts_the_date_in_time_not_styles():
    url = wms_url("MERRA2_2m_Air_Temperature_Monthly", 512, 256, "png", "2020-07-01")
    query = parse_qs(urlparse(url).query, keep_blank_values=True)
    assert query["TIME"] == ["2020-07-01"]
    assert query["STYLES"] == [""]
    assert "2020-07-01" not in query["STYLES"][0]
    undated = parse_qs(urlparse(wms_url("LAYER", 8, 4, "png")).query, keep_blank_values=True)
    assert "TIME" not in undated
    assert undated["STYLES"] == [""]


def test_confirmed_ids_match_the_capabilities_extract():
    text = (FIXTURES / "gibs-identifiers-2026-11-13.txt").read_text(encoding="utf-8")
    for spec in CONFIRMED.values():
        assert spec["id"] in text
        assert spec["colormap"].startswith("https://gibs.earthdata.nasa.gov/colormaps/v1.3/")


def test_quantize_keeps_nodata_and_endpoints():
    import numpy as np

    values = np.array([[0.0, 254.0], [np.nan, 127.0]], dtype=np.float32)
    raw, scale, offset = quantize(values)
    assert raw[1, 0] == 255
    assert raw[0, 0] == 0
    assert raw[0, 1] == 254
    assert offset == 0
    assert abs((offset + int(raw[1, 1]) * scale) - 127) < 1


def test_svs_refuses_prores():
    assert page(5313).endswith("/5313/")
    try:
        refuse_large("film.mov", 10)
    except ValueError:
        return
    raise AssertionError("mov should be refused")
