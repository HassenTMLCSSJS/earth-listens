"""Parsers for the four source formats. Fixtures copy the header shape only."""

from __future__ import annotations


def _rows(text: str) -> list[list[str]]:
    lines = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        lines.append([cell.strip() for cell in line.split(",")])
    return lines


def parse_gistemp(text: str) -> list[dict[str, float | None]]:
    rows = _rows(text)
    header = next(row for row in rows if row and row[0] == "Year")
    index = header.index("J-D")
    out = []
    for row in rows:
        if not row or row[0] == "Year" or not row[0][:4].isdigit():
            continue
        cell = row[index] if index < len(row) else "***"
        out.append({"year": int(row[0]), "value": None if cell == "***" or cell == "" else float(cell)})
    return out


def parse_co2_mm(text: str) -> list[dict[str, float | int | None]]:
    rows = _rows(text)
    header = next(row for row in rows if row and row[0] == "year")
    columns = {name: pos for pos, name in enumerate(header)}
    out = []
    for row in rows:
        if not row or row[0] == "year" or not row[0][:4].isdigit():
            continue
        average = float(row[columns["average"]])
        out.append(
            {
                "year": int(row[columns["year"]]),
                "month": int(row[columns["month"]]),
                "average": None if average in (-99.99, -9.99) else average,
            }
        )
    return out


def parse_nsidc_monthly(text: str) -> list[dict[str, float | int | None]]:
    rows = _rows(text)
    out = []
    for row in rows:
        if not row or row[0] in {"year", "Year"} or not row[0][:4].isdigit():
            continue
        extent = float(row[4])
        out.append(
            {
                "year": int(row[0]),
                "month": int(row[1]),
                "extent": None if extent == -9999 else extent,
            }
        )
    return out


def parse_firms_csv(text: str) -> list[dict[str, float | str]]:
    rows = _rows(text)
    header = next(row for row in rows if row and row[0] == "latitude")
    columns = {name: pos for pos, name in enumerate(header)}
    out = []
    for row in rows:
        if not row or row[0] == "latitude":
            continue
        confidence = row[columns["confidence"]]
        if confidence not in {"n", "h"}:
            continue
        out.append(
            {
                "latitude": float(row[columns["latitude"]]),
                "longitude": float(row[columns["longitude"]]),
                "acq_date": row[columns["acq_date"]],
                "confidence": confidence,
                "frp": float(row[columns["frp"]]),
            }
        )
    return out
