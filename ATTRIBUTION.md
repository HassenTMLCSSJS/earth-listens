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
- `public/textures/earth-day.jpg` is GIBS Blue Marble Next Generation, not a procedural stand-in. See `public/textures/SOURCE.txt`.
- Knowland, K. E., et al.: File Specification for GEOS-CF Products, GMAO Office Note No. 17 (Version 1.3), 12 December 2022. https://gmao.gsfc.nasa.gov/pubs/docs/Knowland1446.pdf
- Lucchesi, R.: File Specification for GEOS FP, GMAO Office Note No. 4 (Version 1.2), 11 July 2018. https://gmao.gsfc.nasa.gov/pubs/docs/Lucchesi1203.pdf
- SVS 5572 GEOS Aerosols, DOI 10.5281/zenodo.16782523. https://svs.gsfc.nasa.gov/5572/
- SVS 14439 (Katie Jepson; Joseph V. Ardizzone; Aaron E. Lepsch), 5151–5154 and 5153 (NASA GMAO; Joseph V. Ardizzone), 5533, 5196, 4960, 5425, 5552, 5669, and 5518 are listed on `/data`. SVS pages were not re-downloaded in this environment on 13 Nov 2026.
- MERRA-2 July 2 m air temperature, MERRA-2 AOD, AMSR2 sea-ice concentration, GEDI canopy height, IMERG precipitation, AIRS CO₂, ISS LIS flash count, and MUR SST frames are GIBS PNG decodes. Credit GIBS / ESDIS. A July or single-day field is not an annual mean.
- GEOS-CF Cairo cell (layer index 72, not 72 hPa) is a model. It is not a station measurement and not an AQI. `1e15` is missing.
- NASA EONET v3 open events are a 30-day list, not a yearly census.
- OpenAQ stations are omitted when `OPENAQ_API_KEY` is unset. No station values were invented.
- FIRMS regional history stays SAMPLE until `FIRMS_MAP_KEY` is available. The acknowledgement above is unchanged.

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

## Voices

- Fixed narration MP3s are rendered with Resemble AI Chatterbox (MIT), https://github.com/resemble-ai/chatterbox. English clips use Chatterbox-Nano. Arabic clips use Chatterbox Multilingual V3. The project was archived in August 2026 and is unmaintained. Resemble AI does not sell or support this text-to-speech code. Every clip keeps Chatterbox's built-in Perth watermark (https://github.com/resemble-ai/perth).
- Lines with no clip use the live chain already in the app. This pass does not add a new in-browser speech model.

## Sample data

Files whose names end in `.sample.json`, and the frames under `public/frames/`, are formulas seeded with `mulberry32(20261114)`. They are labelled SAMPLE. They are not measurements from the sources above.
