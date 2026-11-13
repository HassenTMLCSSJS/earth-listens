"""URLs for the SVS pages this build credits. Downloads stay behind --allow-large."""

from __future__ import annotations

SVS = {
    5313: "https://svs.gsfc.nasa.gov/5313/",
    5475: "https://svs.gsfc.nasa.gov/5475/",
    3912: "https://svs.gsfc.nasa.gov/3912/",
    5425: "https://svs.gsfc.nasa.gov/5425/",
    5669: "https://svs.gsfc.nasa.gov/5669/",
    5533: "https://svs.gsfc.nasa.gov/5533/",
    5011: "https://svs.gsfc.nasa.gov/5011/",
    4950: "https://svs.gsfc.nasa.gov/4950/",
}


def page(svs_id: int) -> str:
    if svs_id not in SVS:
        raise KeyError(svs_id)
    return SVS[svs_id]


def refuse_large(name: str, nbytes: int, max_bytes: int = 200_000_000, allow_large: bool = False) -> None:
    if name.endswith(".mov") or "prores" in name.lower():
        raise ValueError(f"refusing {name}")
    if nbytes > max_bytes and not allow_large:
        raise ValueError(f"{name} is {nbytes} bytes")
