"""Missing markers and the selections the web app expects."""

from __future__ import annotations

from .parse import parse_co2_mm, parse_firms_csv, parse_gistemp, parse_nsidc_monthly

MISSING = {"***", "-99.99", "-9.99", "-1", "-9999"}


def missing_to_none(value: str) -> float | None:
    if value.strip() in MISSING or value.strip() == "":
        return None
    return float(value)


def annual_co2(text: str) -> list[dict[str, float | int | None]]:
    buckets: dict[int, list[float]] = {}
    for row in parse_co2_mm(text):
        average = row["average"]
        if not isinstance(average, float):
            continue
        buckets.setdefault(int(row["year"]), []).append(average)
    return [{"year": year, "value": sum(values) / len(values)} for year, values in sorted(buckets.items())]


def september_ice(text: str) -> list[dict[str, float | int | None]]:
    return [row for row in parse_nsidc_monthly(text) if row["month"] == 9]


def firms_confidence(text: str) -> list[dict[str, float | str]]:
    return parse_firms_csv(text)


def gistemp_annual(text: str) -> list[dict[str, float | None]]:
    return parse_gistemp(text)
