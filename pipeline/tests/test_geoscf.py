from datetime import datetime, timezone

from earth_pipeline.geoscf import GAS_UG_PER_PPBV, ascii_url, index_for, parse_ascii, vmr_to_ugm3


def test_cairo_indexes_and_the_july_fixture_hour():
    when = datetime(2018, 1, 15, 12, 30, tzinfo=timezone.utc)
    t_idx, lat_idx, lon_idx = index_for(30.04, 31.24, when)
    assert (lat_idx, lon_idx) == (480, 845)
    assert t_idx == 348
    url = ascii_url("co", 56952, 556, 240)
    assert url.endswith("?co[56952:56952][0][556][240]")


def test_parse_masks_the_fill_and_keeps_a_real_cairo_sample():
    text = """pm25_rh35_gcc, [2]
[0], 57.632145
[1], 1.0E15
"""
    assert parse_ascii(text) == [57.632145, None]


def test_gas_factors_match_the_stated_conversion():
    assert round(GAS_UG_PER_PPBV["co"], 4) == 1.1445
    assert round(GAS_UG_PER_PPBV["no2"], 4) == 1.8802
    assert round(GAS_UG_PER_PPBV["o3"], 4) == 1.9620
    assert round(GAS_UG_PER_PPBV["so2"], 4) == 2.6160
    # 3.7247855e-7 mol/mol of CO is about 426 µg/m³ at the stated molar volume.
    ug = vmr_to_ugm3(3.7247855e-7, "co")
    assert ug is not None
    assert 420 < ug < 430
    assert vmr_to_ugm3(None, "o3") is None
