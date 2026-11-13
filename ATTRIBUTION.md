# Attribution

Uses NASA data; not endorsed by NASA.

NASA data and imagery are public domain. Credit them anyway.

## FIRMS

We acknowledge the use of data and imagery from LANCE FIRMS operated by NASA's Earth Science Data and Information System (ESDIS) with funding provided by NASA Headquarters.

The same sentence is the wildfire layer’s `source.ack` once that file is real data (`sample: false`). The sample file is not a FIRMS product.

## Other sources

- GISTEMP Team, 2026: GISS Surface Temperature Analysis (GISTEMP), version 4. NASA Goddard Institute for Space Studies. Verify the year and the wording before the submission text is frozen. `[citation needed: Basmala]`
- NOAA Global Monitoring Laboratory, Mauna Loa carbon dioxide: Lan, Tans, and Thoning. Verify the citation. `[citation needed: Basmala]`
- NSIDC Sea Ice Index, G02135, version 4. Fetterer et al. Verify the DOI before citing it. Do not invent one.
- NASA Scientific Visualization Studio, visualization 5113: https://svs.gsfc.nasa.gov/5113/
- NASA Blue Marble (Visible Earth) is the intended globe texture. This build does not include it. `public/textures/earth-day.jpg` is a procedural stand-in, described in `public/textures/SOURCE.txt`. Do not describe that file as a NASA image.

## Textures and live feeds (13 Nov 2026)

Retrieved from NASA GIBS and NOAA. Not endorsed by NASA or NOAA.

- Blue Marble Next Generation and shaded relief + bathymetry: NASA Earth Observatory, Reto Stöckli (NASA GSFC), served by NASA GIBS.
- Black Marble 2012 and 2016: NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from Miguel Román, NASA GSFC. The numbers in the night-lights layer are a **night brightness index (image-derived, not calibrated radiance)**.
- ETOPO 2022 height, water mask, and normals: NOAA National Centers for Environmental Information. 2022: ETOPO 2022 Global Relief Model. The committed grid is a 2048×1024 area average of the 60 arc-second surface grid.
- GHRSST MUR sea-surface temperature, 15 Aug 2024 frame: JPL MUR MEaSUREs Project, GHRSST Level 4 MUR SST v4.1, PO.DAAC, via NASA GIBS. Colormap hit rate on the committed PNG was 1.0.
- We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).
- GISTEMP v4, NOAA GML Mauna Loa CO₂, and NSIDC Sea Ice Index v4 September extent are snapshotted under `public/data/snapshots/`.
- Open-Meteo: "Weather data by Open-Meteo.com" (CC BY 4.0). Air quality adds "Contains modified Copernicus Atmosphere Monitoring Service information".
- NASA EONET and NASA FIRMS: see the source list on `/data`. The bundled FIRMS file is a partial excerpt, not a full day.
- 4K/8K files are not in git. The archive of record is the GitHub release `data-v1`. Browsers load them from `NEXT_PUBLIC_ASSET_BASE_URL` (Cloudflare R2). `scripts/upload-r2.mjs` and `.github/workflows/sync-r2.yml` do the copy. This repository does not upload them.

## Sample data

Files whose names end in `.sample.json`, and the frames under `public/frames/`, are formulas seeded with `mulberry32(20261114)`. They are labelled SAMPLE. They are not measurements from the sources above.
