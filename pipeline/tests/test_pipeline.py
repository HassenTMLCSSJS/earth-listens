import json
import math
from pathlib import Path

import pytest

from earth_pipeline.aggregate import area_weighted_mean, fire_cell, robust_range, top_cells
from earth_pipeline.clean import annual_co2, firms_confidence, gistemp_annual, september_ice
from earth_pipeline.colorbar import build_lut, lookup
from earth_pipeline.export import export_layer
from earth_pipeline.fetch import dry_run
from earth_pipeline.parse import parse_co2_mm, parse_gistemp, parse_nsidc_monthly
from earth_pipeline.validate import pearson

FIXTURES = Path(__file__).parent / "fixtures"


def test_area_weight_and_fire_bins():
    assert area_weighted_mean([0, 60], [1, 3]) == pytest.approx(1.666667, abs=1e-6)
    assert area_weighted_mean([0], [None]) is None
    cases = {
        (37.9, 23.4): (37.5, 22.5),
        (-0.1, -0.1): (-2.5, -2.5),
        (0, 0): (2.5, 2.5),
        (90, 180): (87.5, 177.5),
        (-90, -180): (-87.5, -177.5),
        (30.05, 31.25): (32.5, 32.5),
    }
    for raw, expected in cases.items():
        assert fire_cell(*raw) == expected


def test_parsers_use_synthetic_headers_only():
    annual = gistemp_annual((FIXTURES / "gistemp.csv").read_text())
    assert annual[0]["value"] == pytest.approx(-0.18)
    assert annual[1]["value"] is None
    means = annual_co2((FIXTURES / "co2.csv").read_text())
    assert means[0]["year"] == 1958
    assert means[0]["value"] == pytest.approx(315.5)
    ice = september_ice((FIXTURES / "nsidc.csv").read_text())
    assert [row["extent"] for row in ice] == [7.2, None]
    fires = firms_confidence((FIXTURES / "firms.csv").read_text())
    assert len(fires) == 2
    assert all(row["confidence"] in {"n", "h"} for row in fires)


def test_recorded_csvs_keep_their_first_and_last_values():
    recorded = FIXTURES / "recorded"
    temp = parse_gistemp((recorded / "gistemp-2026-11-13.csv").read_text())
    assert temp[0]["year"] == 1880
    assert temp[0]["value"] == pytest.approx(-0.18)
    assert temp[-2]["year"] == 2025
    assert temp[-2]["value"] == pytest.approx(1.19)
    assert temp[-1]["value"] is None

    co2 = parse_co2_mm((recorded / "co2_mm_mlo-2026-11-13.csv").read_text())
    assert (co2[0]["year"], co2[0]["month"]) == (1958, 3)
    assert co2[0]["average"] == pytest.approx(315.71)
    assert (co2[-1]["year"], co2[-1]["month"]) == (2026, 9)
    assert co2[-1]["average"] == pytest.approx(426.07)

    ice = parse_nsidc_monthly((recorded / "nsidc-sept-2026-11-13.csv").read_text())
    assert ice[0]["year"] == 1979
    assert ice[0]["extent"] == pytest.approx(7.05)
    assert ice[-1]["year"] == 2026
    assert ice[-1]["extent"] == pytest.approx(4.81)


def test_top_cells_and_robust_range():
    rows = [{"lat": 1, "lon": 2, "count": 3}, {"lat": 4, "lon": 0, "count": 9}, {"lat": 4, "lon": 1, "count": 9}]
    assert [row["lat"] for row in top_cells(rows, n=2)] == [4, 4]
    lo, hi = robust_range([1, 2, 3, 4, 100])
    assert lo < hi
    assert lo == pytest.approx(1.2)
    assert hi == pytest.approx(80.8)


def test_colorbar_recovers_a_known_stop():
    lut = build_lut([(0, 0, 255), (255, 0, 0)], [0, 10])
    assert lookup((0, 0, 255), lut) == pytest.approx(0, abs=0.05)
    assert lookup((255, 0, 0), lut) == pytest.approx(10, abs=0.05)
    assert lookup((40, 40, 40), lut) is None


def test_fetch_dry_run_redacts_the_key(monkeypatch, capsys):
    monkeypatch.setenv("FIRMS_MAP_KEY", "super-secret-value")
    assert "{FIRMS_MAP_KEY}" in dry_run("wildfire")
    assert "super-secret-value" not in dry_run("wildfire")
    assert "data.giss.nasa.gov" in dry_run("temperature")
    captured = capsys.readouterr()
    assert "super-secret-value" not in captured.out


def test_export_roundtrip(tmp_path: Path):
    schema = {"type": "object", "required": ["sample"], "properties": {"sample": {"const": False}}}
    schema_path = tmp_path / "schema.json"
    schema_path.write_text(json.dumps(schema))
    dest = tmp_path / "layer.json"
    export_layer({"sample": False, "retrieved": "2026-11-13", "sha256": "abc"}, dest, schema_path)
    assert json.loads(dest.read_text())["sample"] is False


def test_pearson_on_a_sample_ramp():
    assert pearson([0, 1, 2], [0, 1, 2]) == pytest.approx(1)
    assert pearson([0, 1, 2], [0, 1, 2.01]) > 0.9
    assert not math.isnan(pearson([0, 1, 2], [2, 1, 0]))
