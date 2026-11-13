"""Print the source URLs. A dry run never reads FIRMS_MAP_KEY into the URL."""

from __future__ import annotations

import argparse

URLS = {
    "temperature": "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv",
    "co2": "https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv",
    "sea_ice": "https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_09_extent_v4.0.csv",
    "wildfire": "https://firms.modaps.eosdis.nasa.gov/api/area/csv/{FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/-18,-35,52,38/1/2025-08-04",
}


def dry_run(layer: str) -> str:
    if layer not in URLS:
        raise SystemExit(f"unknown layer {layer}")
    return URLS[layer]


def main() -> None:
    parser = argparse.ArgumentParser(description="Print Earth Listens source URLs. Does not download.")
    parser.add_argument("--layer", required=True, choices=sorted(URLS))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.dry_run:
        raise SystemExit("Refusing to fetch. Re-run with --dry-run. Real downloads are a team step.")
    print(dry_run(args.layer))


if __name__ == "__main__":
    main()
