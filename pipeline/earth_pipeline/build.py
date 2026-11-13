"""Propose ranges from a local fixture. This command does not hit the network."""

from __future__ import annotations

import argparse
from pathlib import Path

from .aggregate import robust_range
from .clean import annual_co2, firms_confidence, gistemp_annual, september_ice

PARSERS = {
    "temperature": gistemp_annual,
    "co2": annual_co2,
    "sea_ice": september_ice,
    "wildfire": firms_confidence,
}


def propose(layer: str, text: str) -> tuple[float, float]:
    rows = PARSERS[layer](text)
    values = []
    for row in rows:
        value = row.get("value", row.get("frp"))
        if isinstance(value, (int, float)):
            values.append(float(value))
    return robust_range(values)


def main() -> None:
    parser = argparse.ArgumentParser(description="Propose a sample-free range from a local file.")
    parser.add_argument("--layer", required=True, choices=sorted(PARSERS))
    parser.add_argument("--input", type=Path, required=True)
    args = parser.parse_args()
    lo, hi = propose(args.layer, args.input.read_text(encoding="utf-8"))
    print(f"proposed range {lo:.6f} {hi:.6f}")


if __name__ == "__main__":
    main()
