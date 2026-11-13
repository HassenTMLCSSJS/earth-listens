from pathlib import Path

import numpy as np

from earth_pipeline.gibs import (
    check_budget,
    decode_image,
    lightning_seasons,
    parse_colormap,
    region_mean,
    resample_block_mean,
)
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


def test_svs_refuses_prores():
    assert page(5313).endswith("/5313/")
    try:
        refuse_large("film.mov", 10)
    except ValueError:
        return
    raise AssertionError("mov should be refused")
