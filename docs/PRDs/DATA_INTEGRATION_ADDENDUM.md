# Earth Listens: Data Integration Addendum (v4, 2026-11-13, Cairo time UTC+2)

> **v3 is kept unchanged in `DATA_INTEGRATION_ADDENDUM_v3.md`.** This file is v3 with the "v4 changes" section below added at the top, and the §16, §17 and CI-fix sections updated to show what is merged. The rest of the remaining work, with owners, files and acceptance criteria, is in `PRD_v4_REMAINING_WORK.md`. Where they differ, the PRD wins.

## v4 changes (what is new since v3, 12:07 Cairo)

### V4.1 Built and merged (PR #3 `feat/data-integration` → `develop`, merged 13 Nov 13:57 Cairo, merge commit `d3e5634`)

- All 4 CI checks are green on head `44fe169`: `web`, `e2e`, `lighthouse`, `pipeline`.
- Vitest: 82 tests pass, line coverage 91.91%. Playwright: 25/25. Lighthouse accessibility is 1.00 on all 6 URLs.
- Lighthouse performance from the PR #3 CI run:
  - `/en` 0.96, `/ar` 0.95, quiz 0.94, guide 0.91.
  - `/en/listen?demo=1` 0.80 and `/en/tutorial` 0.81. Both are under the 0.85 target; they are a warning, not a failure.
  - The earlier local run in `docs/validation/perf.md` recorded listen 0.84 and tutorial 0.84.
- Real data: night lights 2012/2016 (the only layer with `sample: false`), a MUR SST frame for 15 Aug 2024, 2K NASA textures with ETOPO relief, and 8 live feeds, each with a bundled snapshot:
  - eonet, firms-24h, gibs-grid, gistemp
  - noaa-gml, nsidc, open-meteo, open-meteo-aq
- Registry has 10 layers. Every layer except `night_lights` still points to a `*.sample.json`: temperature, wildfire, sea_ice, co2, ocean_sst, ocean_currents, aerosols, air_quality, lightning.
- **Past the cut line, not built:** MERRA-2 temperature frames, AMSR2 sea ice, GEDI, SVS intro media, EONET markers, OpenAQ dots, FIRMS history, precipitation, AIRS. The aerosol, lightning and air-quality sequences are still SAMPLE.
- The JS bundle is about 2.1 MB gzip across all chunks (PR #3). The largest chunk is 882 KB: kokoro/onnxruntime voice, already loaded through `import()`.

### V4.2 CI fix: merged

- No separate `fix/ci-pnpm-builds` branch was made. The fix went in as the first commit of `feat/data-integration` (`56f2854`), and a follow-up commit `8bc8c3d` stopped setup-node from requiring pnpm before corepack. Both reached `develop` with PR #3, so the prerequisite in the "CI fix" section at the bottom is done.
- `main` is still at `7950683`, from before the fix. CI there shows `web` failed and `e2e`/`lighthouse` skipped. It is fixed by merging `develop` → `main` (PRD A8, tag `v0.2-data`).
- The only tag is `base-phase-a`. Docs that mention `v0.1-base` are wrong.

### V4.3 New research sources (from `research-intake/RESEARCH_REVIEW.md`)

`public/data/sources.json` has 36 ids. The 11 ids listed in review §7.1 are all missing from it (PRD B1):

| Source (`sources.json` id)                                     | What it is                                                                                                     | Review verdict                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `svs-14439`                                                    | Air Pollution Model Runs: compact GEOS-CF CO animation (`CO.webm` 3.5 MB), plus ozone, PM2.5 and NO animations | Adopt now (CO clip + print still)                                |
| `svs-5153` (+ `svs-5151` PM2.5, `svs-5152` O₃, `svs-5154` NOₓ) | Near-surface GEOS-CF stills and color bars ("Updates Regularly" series)                                        | Adopt now (stills + color bars); daily frames after the cut line |
| `svs-5572`                                                     | GEOS Aerosols, 45-day species visualization, stills + color bar; DOI 10.5281/zenodo.16782523                   | Adopt now (1920 stills, color bar, DOI)                          |
| `svs-5552`                                                     | Science On a Sphere: Aerosols, equirectangular stills (1024×512 / 2048×1024) for the globe                     | Adopt now (still); movie later (PRD B4)                          |
| `svs-5518`                                                     | Science On a Sphere: Air Quality Model Runs                                                                    | Adopt later                                                      |
| `geos-cf-opendap`                                              | NCCS GEOS-CF V1 OPeNDAP collection URL (PRD A4)                                                                | Adopt now                                                        |
| `gmao-knowland-1446`                                           | Knowland et al., File Specification for GEOS-CF Products, GMAO Office Note 17 v1.3 (2022)                      | Adopt now (citation)                                             |
| `gmao-lucchesi-1203`                                           | Lucchesi, File Specification for GEOS FP, GMAO Office Note 4 v1.2 (2018)                                       | Adopt now (aerosol citation)                                     |
| `gmao-geos-cf`                                                 | GMAO GEOS-CF product page (cited with Knowland; added by the PRD, beyond the review's 11)                      | Adopt now (citation)                                             |
| `svs-5113`                                                     | VIIRS active fires 2024–present (already cited in `ATTRIBUTION.md`)                                            | Add only if a still or clip is used                              |

Caveats to show on `/data`: GEOS-CF/GEOS-FP visuals are **modeled**, not station measurements or AQI; `lev` 72 is a model index, not a height; `1e15` means missing, never zero.

Decision recommended in PRD §4: use the SVS media as "Real NASA view" cards. Keep the 8 intro scenes in Zain's guide as the intro itself.

### V4.4 GEOS-CF air quality: verified facts (replaces the §3 "GEOS-CF historical" placeholder)

These were checked with WebFetch against the NCCS OPeNDAP server. curl from the box timed out.

- Collection `aqc_tavg_1hr_g1440x721_v1`:
  - 0.25° grid (1440×721), `lev` 72, hourly means.
  - Time runs from 00:30Z 01 Jan 2018 to 11:30Z 02 Jan 2026.
  - Fill value `1e15`.
- Variables: `pm25_rh35_gcc` (µg/m³, the main value), plus `no2`, `co`, `so2`, `o3` in ppbv. Molar masses: NO₂ 46, CO 28, SO₂ 64, O₃ 48.
- Cairo grid index `[lat 480][lon 845]`. The research fixture was checked against the `chm_tavg_1hr_g1440x721_v1` collection (variable `co` in mol mol⁻¹; 5 hours on 1 Jul 2024 at 49.0°N, 120.0°W): `…ascii?co[56952:56956][0][556][240]`.
- Gas conversion, stated in the UI as "at 25 °C, 1 atm": µg/m³ = ppbv × MW / 24.465. That gives CO × 1.1445, NO₂ × 1.8802, O₃ × 1.9620, SO₂ × 2.6160.
- Real years are 2018–2025. Earlier years are labelled "no model data", never filled.
- Schema: gases go in the existing `variables` record. Because zod 4 `z.record` with enum keys is exhaustive, use `z.partialRecord` (PRD A3/A4).

### V4.5 Recorded histories become P0

The full CSVs already in `pipeline/tests/fixtures/recorded/` replace the samples (PRD A3):

- GISTEMP 1880–2025
- NOAA GML CO₂ monthly, 1958 to Sep 2026
- NSIDC September extent, 1979–2026

`build.py` already has parsers for temperature, co2, sea_ice and wildfire. Real files use `frames: []` until maps exist.

### V4.6 Cloudflare R2

- Bucket `earth-listens-assets` is created. Its public dev URL is `https://pub-f4844155e9804bb5adcb0c121896e82b.r2.dev` with CORS open. `NEXT_PUBLIC_ASSET_BASE_URL` is set in the local env file.
- **Not done:** the GitHub release `data-v1` has not been created, nothing is uploaded, and there is no R2 S3 access key (PRD A6).
- The r2.dev host is hard-coded in `src/core/csp.ts` (`DATA_HOSTS`) and `src/core/assets.ts` (`DEFAULT_ASSET_BASE`). A custom domain needs both files changed, not only the env var.

### V4.7 Secrets: changes to §15 (names only, values never in docs)

- **Remove `REVALIDATE_SECRET`** (PRD A1). No route uses it; it appears only in `.env.example`, `src/core/env.ts` and `README.md`.
- `FIRMS_MAP_KEY`: obtained and set in the local env file. I have not checked whether it is in Vercel or GitHub secrets. `CLOUDFLARE_API_TOKEN`: set locally (for the R2 upload, never in the client).
- `CRON_SECRET`: the cron route returns 401 without a valid `Bearer` header.
- `NASA_API_KEY` and `EARTHDATA_TOKEN` are unused.
- Rotate the keys that were shared in chat after the event (PRD E6).

### V4.8 Intro: 8 scenes (changes §8)

Zain's visual guide replaces the "6 existing chapters" mapping in §8 with an 8-scene, 100 s Theatre.js sequence (PRD D4). `home-experience.tsx` needs these changes:

- `CHAPTERS` goes from 6 to 8.
- The CTA check changes from `chapter === 5` to `chapter === 7`.
- `tests/e2e/earth.spec.ts` changes its loop from `step < 5` to `step < 7`.

SVS media moves to "Real NASA view" cards (V4.3).

### V4.9 Snapshot workflow (corrects §11.1)

`.github/workflows/snapshot.yml` runs every 3 h. It runs `scripts/snapshot.ts` and uploads `public/data/snapshots` as a 7-day Actions artifact. It does **not** publish to R2, commit, or trigger revalidation, so the deployed fallback is the snapshot bundled at build time. An R2 upload step is an optional follow-up (PRD A6, P2). The release mirror is `.github/workflows/sync-r2.yml` (manual dispatch, `tag=data-v1`).

### V4.10 Known doc errors

`ATTRIBUTION.md` and `README.md` call the day texture a procedural stand-in. `public/textures/SOURCE.txt` and PR #3 say it is GIBS Blue Marble NG. Fix in PRD B1. The opening paragraphs below (v3) say the same and are now out of date.

---

Companion to `BUILD_BRIEF.md`. Execute on a **new branch `feat/data-integration` cut from `develop`** (PR #1 `feat/base-mvp` is already merged into `develop`), **only after Hassan approves this plan.**

**Build on what `develop` already has; do not re-specify it:** per-layer Tone.js timbres, the 6-chapter Lenis/ScrollTrigger intro, and the displaced shader globe with a fresnel atmosphere and note pulses. The globe's texture is still a procedural stand-in, so this addendum mainly **swaps in real NASA textures, height data and data overlays** and extends the existing shader, timbre and intro code. Before starting, read the current `modules/globe`, `sonification/timbres.ts` and `modules/intro` code and keep their names and uniforms. Do not merge, deploy, force-push or rewrite history without his explicit OK. Never commit secrets (`FIRMS_MAP_KEY`, Earthdata tokens) — `.env.example` gets placeholders only.

**Golden rule: no fabricated data.** Every number, frame and texture shipped with `sample:false` must come from a URL listed here, recorded in `pipeline/raw/manifest.json` with retrieval date and SHA-256. Synthetic sample files stay `sample:true` and watermarked. If a fetch fails, the layer stays on its sample file and the UI says so. Never "fill in" a value.

---

## 0. What was verified on 2026-11-13 (and how)

| Check                                                                                                         | Result                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Official challenge page `spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/?tab=resources` | **Not reachable from the box**: server sends an incomplete TLS chain (SSL.com intermediate missing; AIA URL returns 500). WebFetch also 500. Did **not** bypass TLS. The resource list was taken from the HackAthlone mirror of the official list (11 resources, all `svs.gsfc.nasa.gov`). **Someone must open the official page in a normal browser and diff it against §2.** |
| SVS API `https://svs.gsfc.nasa.gov/api/<id>`                                                                  | Reachable via WebFetch (JSON: media groups, file names, pixel sizes, credits, datasets). **curl from the box times out**, so no SVS media were downloaded; file sizes below come from SVS metadata.                                                                                                                                                                            |
| NASA GIBS WMS/WMTS `gibs.earthdata.nasa.gov`                                                                  | **Reachable from the box, no key.** Capabilities parsed (1,352 layers in EPSG:4326 "best"). Samples downloaded (see §0.1). 8192×4096 WMS GetMap of `BlueMarble_ShadedRelief_Bathymetry` returned 3.1 MB JPEG in 24 s.                                                                                                                                                          |
| GIBS colormaps `gibs.earthdata.nasa.gov/colormaps/v1.3/*.xml`                                                 | Reachable. **Decoding test: 298,528 / 298,528 opaque pixels of the MUR SST PNG matched a colormap entry exactly (100%)** → real numeric value bins (0.15 °C steps) can be recovered from GIBS PNGs without Earthdata login.                                                                                                                                                    |
| `eoimages.gsfc.nasa.gov` (Visible Earth full-res BMNG / Black Marble files)                                   | TLS handshake EOF from the box (likely network-path issue, not a dead link). Visible Earth pages now redirect to `science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/...`. Use GIBS instead (same BMNG/Black Marble products).                                                                                                                               |
| NOAA ETOPO page `ncei.noaa.gov/products/etopo-global-relief-model`                                            | 200.                                                                                                                                                                                                                                                                                                                                                                           |
| GISTEMP CSV                                                                                                   | 200 (12.9 KB).                                                                                                                                                                                                                                                                                                                                                                 |
| GHRC LIS raw (`ghrcdrive.nsstc.nasa.gov`), GEOS-CF datashare (`portal.nccs.nasa.gov`)                         | Timed out from the box. Treat as optional; GIBS/SVS cover the visuals.                                                                                                                                                                                                                                                                                                         |

### 0.1 Samples on the box (`/workspace/jukebox/samples/`, 1024×512 equirectangular unless noted)

`BlueMarble_NextGeneration.jpg`, `BlueMarble_ShadedRelief_Bathymetry.jpg` (+ `bm8k.jpg` 8192×4096), `ASTER_GDEM_Greyscale_Shaded_Relief.jpg`, `VIIRS_Black_Marble_2012.png`, `VIIRS_Black_Marble_2016.png` (differ: max Δ 150 levels, changes are local → use regional crops for before/after), `GHRSST_MUR_SST_2024-08-19.png`, `GHRSST_MUR_colormap.xml`, `MERRA2_AOD_2024-08.png`, `IMERG_2024-08-19.png`, `GEDI_ISS_L3_Canopy_Height_Mean_RH100_201904-202303.jpg`, `LIS_High_Resolution_Full_Climatology_Combined_Flash_Rate_Climatology.jpg`, `LIS_ISS_Flash_Count_2020-07.png` (3.8 KB: one day of ISS LIS is sparse; aggregate days).

### 0.2 Universal GIBS request templates (no key)

```
# Equirectangular snapshot (any size up to 8192x4096 tested):
https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0
  &LAYERS={layer}&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH={w}&HEIGHT={h}
  &FORMAT=image/{png|jpeg}&STYLES=&TIME={YYYY-MM-DD}
# Tiles for LOD streaming:
https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layer}/default/{YYYY-MM-DD}/{TileMatrixSet}/{z}/{row}/{col}.{png|jpg}
# Capabilities (time extents, tile matrix sets, colormap links):
https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml
# Colormap for value decoding:
https://gibs.earthdata.nasa.gov/colormaps/v1.3/{ColormapName}.xml   (follow the layer's ows:Metadata colormap link)
```

**Always request PNG for data layers** (exact palette → exact values); JPEG only for photographic base maps. WMS requests at reduced size may resample; if the exact-match rate drops below 99%, fetch WMTS tiles at native zoom and downsample after decoding (mode/median of values, not of colors).

---

## 1. Verdict summary

Counts (39 resources): **core 14 · use 13 · optional 10 · skip 2**.

- Official challenge resources (11): core 5, use 4, optional 2, skip 0.
- Supplementary NASA/NOAA sources (24): core 5, use 9, optional 8, skip 2. These are **not** in the official list; they are required to deliver Hassan's asks (real textures, height maps, history over time) and are labeled "supplementary" in the UI and attribution.
- Existing base-MVP layers (4): core 4.
- **Live / gap-fill sources added in v3 (10, see §11 and §13):** core 2 (FIRMS 24 h CSV, Open-Meteo air quality), use 4 (Open-Meteo forecast, NOAA GML daily CO₂, EONET, Natural Earth), optional 4 (OpenAQ, POWER, EPIC, GEBCO). **Grand total 49: core 16 · use 17 · optional 14 · skip 2.**

**Top 5 datasets** (sound + visuals + history, all reachable without keys):

1. **Night Lights change 2012–2023** (SVS 5313/5475 + GIBS `VIIRS_Black_Marble` 2012 & 2016) — the best before/after story, perfect for Guess the Earth.
2. **Ocean: ECCO2 currents + SST** (SVS 3912, 5425/5505) **+ GHRSST MUR SST daily 2002–2026** (GIBS, exact decode) — real numeric SST history plus the most beautiful visuals.
3. **Aerosols** (SVS 5669/5572/5552 + GIBS `MERRA2_Aerosol_Optical_Depth_Analysis_Monthly` 1980-01 → 2026-08) — four aerosol types map 1:1 onto four timbres; 46 years of monthly history.
4. **Lightning** (SVS 5011 + GIBS LIS climatology & `LIS_ISS_Flash_Count` 2017-03 → 2021-09) — discrete events = rhythm, the clearest "HOW FAST" demo.
5. **Air quality GEOS-CF** (SVS 5533/5518 + daily 5147–5154) — PM2.5/O₃/CO/NOₓ, a four-voice chord; Cairo/Egypt relevance.

Plus the globe foundation (not a "dataset" but core): **BMNG day texture + ETOPO 2022 height/bathymetry + Black Marble night lights.**

---

## 2. Inventory (access facts)

License: all NASA SVS/GIBS/Earth Observatory imagery and data are free to use with no copyright restriction under NASA media guidelines (credit required, no implied endorsement). NOAA NCEI ETOPO is US-government public domain. Exceptions are flagged in the row. Reachability is as tested from the box on 2026-11-13.

### 2.1 Official challenge resources (R1–R11)

| ID  | Resource                                                                                                                               | Format / resolution                                                                                                                                                                                                                       | Time span                                | Size (SVS metadata)                                          | Access                                                                                   | Reachable                                             | Credit line                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | EIC Content gallery `https://svs.gsfc.nasa.gov/gallery/earth-information-center/`                                                      | HTML index → dashboards (Earth Now 40509, Vital Signs 40473, GHG 40477, CO₂ sources/sinks 40479, Air Quality 40529, Wildland Fires 40531), EIC videos, beauty pieces, Daily Visualizations 40512                                          | 2023–2025                                | n/a                                                          | Web, no key                                                                              | ✅ WebFetch                                           | "NASA's Scientific Visualization Studio / Earth Information Center"                                                                                                        |
| R2  | Data Sonification: Caldwell 73 `https://svs.gsfc.nasa.gov/13786/`                                                                      | Video 1920×1920 mp4 (73.9 MB), still 1920×1080 jpg                                                                                                                                                                                        | 2020 release                             | 74 MB                                                        | Direct download                                                                          | ✅ (search/WebFetch)                                  | "Sonification: SYSTEM Sounds (M. Russo, A. Santaguida); NASA/ESA/G. Piotto; NASA GSFC"                                                                                     |
| R3  | Change in Night Lights 2012–2023 (EIC) `https://svs.gsfc.nasa.gov/5313/`                                                               | Flat map frames 7680×2160 (32:9) `/vis/a000000/a005300/a005313/frames/7680x2160_32x9_30p/nightlights_2012-2023_change_flat_eic/`; mp4 7680×2160                                                                                           | annual 2012–2023 + change map            | mp4 32.7 MB; ProRes 4.0 GB (**do not download**)             | Direct download                                                                          | ✅ API                                                | "NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from Miguel Román, NASA GSFC; visualization Kel Elkins (USRA), NASA SVS"                      |
| R3a | (alt) SOS night lights `https://svs.gsfc.nasa.gov/5475/`                                                                               | Equirect PNG 2048×1024 `nightlights_2012-2024_KSC_SOS_04_plus2_0900_2k.png`                                                                                                                                                               | 2012–2024                                | few MB                                                       | Direct                                                                                   | ✅ API                                                | same as R3                                                                                                                                                                 |
| R4  | Global Sea Surface Currents & Temperature `https://svs.gsfc.nasa.gov/3912/`                                                            | **Equirect** frames 2048×1024 (`frames/2048x1024_1x1_30p/orig/`, `/with_colorbar/`) and 6840×3420; `ecco2_and_grid.tif` 6840×3420; colorbar `sst_ecco2_cbar.png` (0–32 °C); mp4 `ecco2_sst_flow.mp4` 2048×1024                            | 2007-03-25 → 2008-03-03 (daily model)    | frames: hundreds × ~1–3 MB; download a decimated subset only | Direct                                                                                   | ✅ API                                                | "NASA/GSFC Scientific Visualization Studio; ECCO2 model (MIT/JPL); Greg Shirah, Horace Mitchell, Eric Sokolowsky; scientists Hong Zhang (UCLA), Dimitris Menemenlis (JPL)" |
| R5  | GEOS Aerosols (2025) `https://svs.gsfc.nasa.gov/5669/`                                                                                 | Single still PNG 1920×1080 → 7680×4320 `Aerosols_2025-08-19T20_00_00_<WxH>.png`; colorbar `Aerosols_cbar.png` 1500×300                                                                                                                    | 2025-08-19 20:00 UTC                     | ~2–30 MB per PNG                                             | Direct                                                                                   | ✅ API                                                | "NASA GMAO; Joseph V. Ardizzone, Helen-Nicole Kostis (SVS); science Lesley Ott; GEOS-FP"                                                                                   |
| R5a | (related) 5572 time series, 5552 SOS equirect 1024×512 preview                                                                         | movie/frames                                                                                                                                                                                                                              | 2024-08-01 → 2024-09-14                  | —                                                            | Direct                                                                                   | ✅ API (listed in 5669 related)                       | same                                                                                                                                                                       |
| R6  | Air Quality Model Runs `https://svs.gsfc.nasa.gov/5533/`                                                                               | Frames 5760×3240 (sphere & map with labels), 7680×2160 EIC flat frames; variables CO, PM2.5, O₃, NOₓ                                                                                                                                      | 2024-07-01 → 2024-09-14                  | movies 100s MB                                               | Direct; raw NetCDF at `https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/`          | ✅ API; datashare ❌ timeout                          | "NASA GMAO GEOS-CF; Helen-Nicole Kostis, Joseph V. Ardizzone; Lesley Ott"                                                                                                  |
| R6a | (related) 5518 SOS equirect; **5147–5154 daily 2048×1024 maps** (near-surface temp, wind, precip+clouds, humidity, PM2.5, O₃, CO, NOₓ) | equirect PNG                                                                                                                                                                                                                              | daily, latest 2026-11-13                 | ~1–3 MB each                                                 | Direct                                                                                   | ✅ API                                                | same                                                                                                                                                                       |
| R7  | Perpetual Ocean 2: Western Boundary Currents `https://svs.gsfc.nasa.gov/5425/`                                                         | Perspective frames 3840×2160 (beauty_all_depths, temperature, salinity, 600 m-and-below, sea_ice, land_only, land_mask, equator, dates); 9600×3240 frames; mp4 1080p/2160p; colorbars: temperature 0–25 °C, salinity 33–36, deep −3–22 °C | 2021-01-15 → 2023-12-25                  | 2160p mp4s 100s MB; produced film 14745 is 3.0 GB (skip)     | Direct                                                                                   | ✅ API                                                | "NASA/GSFC SVS: Greg Shirah, Horace Mitchell; scientists Atousa Saberi (GSFC), Josh Willis (JPL); ECCO2; Blue Marble NG (Reto Stöckli); ETOPO"                             |
| R7a | (alt) **5505 Perpetual Ocean 2 equirectangular** (preview 1280×640), 5479 SOS (salinity/temperature/beauty), 5529 polar views          | equirect                                                                                                                                                                                                                                  | 2021–2023                                | —                                                            | Direct                                                                                   | listed in 5425 API (5505 API curl timed out from box) | same                                                                                                                                                                       |
| R8  | DYAMOND Global CO₂ `https://svs.gsfc.nasa.gov/5196/`                                                                                   | Globe-orbit frames 5760×3240 (perspective only); mp4 1080p 6.9 MB, 2160p 68.4 MB; colorbar `dyamondCbar_6-27-2024a.png`                                                                                                                   | 2020-01 → 2020-03                        | 7–68 MB                                                      | Direct                                                                                   | ✅ API                                                | "NASA GMAO GEOS DYAMOND; AJ Christensen et al. (SVS); Lesley Ott"                                                                                                          |
| R9  | ISS LIS Lightning 2017–2023 `https://svs.gsfc.nasa.gov/5011/`                                                                          | SOS **equirect movie 4096×2048** `iss_lightning_sos_yearly_07312023_2048p60.mp4`; sphere 1080p (127 MB), 4K (414 MB), EIC 7680×2160 (579.9 MB)                                                                                            | 2017-01 → 2023-07 (10-day roving window) | 127–580 MB                                                   | Direct; raw points `https://ghrcdrive.nsstc.nasa.gov/pub/lis/iss/data/science/final/nc/` | ✅ API; GHRC ❌ timeout                               | "NASA SVS: Michala Garrison; data Blakeslee (2020), ISS LIS, NASA GHRC DAAC; Natural Earth; MODIS MCD12C1"                                                                 |
| R10 | 3D Atmospheric River `https://svs.gsfc.nasa.gov/4960/`                                                                                 | Perspective 3D movie; narrated 4K mp4 646.9 MB, HD mp4 410.9 MB, **HD webm 68.6 MB**, captions `.srt/.vtt` (6.3 KB)                                                                                                                       | single event (MERRA-2 reanalysis)        | 69–647 MB                                                    | Direct                                                                                   | ✅ (gallery/search)                                   | "NASA GMAO MERRA-2; NASA SVS"                                                                                                                                              |
| R11 | GEDI Forest Height `https://svs.gsfc.nasa.gov/4950/`                                                                                   | Globe frames 3840×2160 (perspective, height exaggerated), regional closeups (CA, FL, Goddard, Laurentides, Senegal), colorbars 0–40/0–50/0–75 m; mp4 1080p 17.7 MB, webm 6.0 MB, 2160p 61.5 MB                                            | 2019-04 → 2020-04                        | 6–66 MB                                                      | Direct; science data `https://gedi.umd.edu/`                                             | ✅ API                                                | "NASA SVS: Kel Elkins et al.; scientists Temilola Fatoyinbo, Atticus Stovall; GEDI (Univ. of Maryland / NASA)"                                                             |

### 2.2 Supplementary sources (S1–S24) and existing layers (E1–E4)

| ID  | Source                                                                                 | Layer / URL                                                                                                                                                                                                                                                          | Native res                                        | Time span (GIBS capabilities)                        | Access                                      | Reachable                               | Credit                                                                                                                |
| --- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| S1  | Blue Marble Next Generation (day)                                                      | GIBS `BlueMarble_NextGeneration` (JPEG)                                                                                                                                                                                                                              | 500 m                                             | static (2004 composite)                              | WMS/WMTS, no key                            | ✅ sample                               | "NASA Earth Observatory, Blue Marble NG by Reto Stöckli (NASA GSFC); served by NASA GIBS"                             |
| S2  | BMNG shaded relief + bathymetry                                                        | GIBS `BlueMarble_ShadedRelief_Bathymetry` (JPEG)                                                                                                                                                                                                                     | 500 m                                             | static                                               | WMS/WMTS                                    | ✅ sample + 8K                          | same                                                                                                                  |
| S3  | **ETOPO 2022 global relief (height + bathymetry)**                                     | `https://www.ncei.noaa.gov/products/etopo-global-relief-model` → 60 arc-sec "surface" GeoTIFF/NetCDF (also 30″, 15″ tiles)                                                                                                                                           | 60″ ≈ 1.85 km (21600×10800)                       | static                                               | Direct download, no key                     | ✅ page (file not fetched)              | "NOAA National Centers for Environmental Information (2022): ETOPO 2022 Global Relief Model" (verify DOI on the page) |
| S4  | **Black Marble night lights**                                                          | GIBS `VIIRS_Black_Marble`, TIME=2012-01-01 and 2016-01-01                                                                                                                                                                                                            | 500 m                                             | 2012, 2016                                           | WMS/WMTS                                    | ✅ both years                           | "NASA Earth Observatory / Black Marble (Suomi NPP VIIRS), Miguel Román, NASA GSFC; NASA GIBS"                         |
| S5  | City Lights 2012                                                                       | GIBS `VIIRS_CityLights_2012`                                                                                                                                                                                                                                         | 500 m                                             | 2012                                                 | WMS                                         | listed                                  | duplicate of S4-2012                                                                                                  |
| S6  | **GHRSST MUR SST (L4, daily)**                                                         | GIBS `GHRSST_L4_MUR_Sea_Surface_Temperature` (PNG + colormap)                                                                                                                                                                                                        | 1 km                                              | 2002-06-01 → 2026-11-11 daily                        | WMS/WMTS                                    | ✅ sample, 100% decode                  | "JPL MUR MEaSUREs Project, GHRSST L4 MUR SST v4.1, PO.DAAC; NASA GIBS"                                                |
| S7  | MERRA-2 aerosol optical depth (monthly)                                                | GIBS `MERRA2_Aerosol_Optical_Depth_Analysis_Monthly`                                                                                                                                                                                                                 | 2 km tiles (model ~0.5°)                          | 1980-01 → 2026-08 monthly                            | WMS                                         | ✅ sample                               | "NASA GMAO MERRA-2; NASA GIBS"                                                                                        |
| S8  | MERRA-2 2 m air temperature (monthly)                                                  | GIBS `MERRA2_2m_Air_Temperature_Monthly`                                                                                                                                                                                                                             | model ~0.5°                                       | 1980-01 → 2026-08                                    | WMS                                         | listed                                  | same                                                                                                                  |
| S9  | LIS lightning climatology + ISS LIS daily flash count                                  | GIBS `LIS_High_Resolution_Full_Climatology_Combined_Flash_Rate_Climatology`, `LIS_ISS_Flash_Count`, `LIS_ISS_Flash_Radiance`                                                                                                                                         | 2 km tiles                                        | climatology 1995→; ISS daily 2017-03-01 → 2021-09-29 | WMS                                         | ✅ samples                              | "NASA GHRC DAAC LIS (Blakeslee); NASA GIBS"                                                                           |
| S10 | GEDI L3 gridded canopy height / std-dev / footprint count / elevation, and L4B biomass | GIBS `GEDI_ISS_L3_Canopy_Height_Mean_RH100_201904-202303` (+ `_StdDev_`, `_Laser_Footprint_Count_`, `_Elevation_Mean_Lowest_Mode_`, cumulative windows ending 202010, 202104, 202108, 202201, 202303), `GEDI_ISS_L4B_Aboveground_Biomass_Density_Mean_201904-202303` | 1 km grid                                         | cumulative 2019-04 → 2023-03                         | WMS                                         | ✅ sample                               | "GEDI L3/L4B, Dubayah et al., ORNL DAAC (verify DOI); NASA GIBS"                                                      |
| S11 | IMERG precipitation rate                                                               | GIBS `IMERG_Precipitation_Rate`                                                                                                                                                                                                                                      | 2 km tiles (~10 km)                               | 2000-06-01 → 2026-11-11 daily                        | WMS                                         | ✅ sample                               | "NASA GPM IMERG; NASA GIBS"                                                                                           |
| S12 | AMSR2 sea-ice concentration                                                            | GIBS `AMSRU2_Sea_Ice_Concentration_12km`                                                                                                                                                                                                                             | 12 km                                             | 2012-07-02 → 2025-09-01 daily                        | WMS                                         | listed                                  | "NASA/JAXA AMSR2 (NSIDC); NASA GIBS"                                                                                  |
| S13 | Active fires (VIIRS/MODIS) as vector tiles                                             | GIBS `VIIRS_SNPP_Thermal_Anomalies_375m_All` (2012-01-20 → 2026-11-02), `MODIS_Combined_Thermal_Anomalies_All` (2002 → 2026-11-13)                                                                                                                                   | MVT                                               | daily                                                | WMTS vector tiles, no key                   | listed                                  | FIRMS ack (§9)                                                                                                        |
| S14 | AIRS CO₂ (mid-troposphere, monthly)                                                    | GIBS `AIRS_L3_Carbon_Dioxide_AIRS_AMSU_Monthly`                                                                                                                                                                                                                      | model ~2°                                         | 2002-09 → 2012-02                                    | WMS                                         | listed                                  | "NASA AIRS (JPL); NASA GIBS"                                                                                          |
| S15 | MERRA-2 dust PM2.5 (monthly)                                                           | GIBS `MERRA2_Dust_Surface_Mass_Concentration_PM25_Monthly`                                                                                                                                                                                                           | ~0.5°                                             | 1980-01 → 2026-08                                    | WMS                                         | listed                                  | "NASA GMAO MERRA-2"                                                                                                   |
| S16 | Spread of the Dixie Fire 2021                                                          | `https://svs.gsfc.nasa.gov/4993/` (in EIC gallery)                                                                                                                                                                                                                   | 1080p/2160p mp4 173–514 MB                        | 2021-07-14 → 10-22                                   | Direct                                      | ✅ gallery                              | NASA SVS                                                                                                              |
| S17 | Perpetual Ocean 2 equirectangular                                                      | `https://svs.gsfc.nasa.gov/5505/`                                                                                                                                                                                                                                    | equirect (preview 1280×640; full sizes: read API) | 2021–2023                                            | Direct                                      | listed in 5425                          | as R7                                                                                                                 |
| S18 | SOS night lights 2012–2024                                                             | `https://svs.gsfc.nasa.gov/5475/`                                                                                                                                                                                                                                    | 2048×1024 PNG                                     | 2012–2024                                            | Direct                                      | ✅ API                                  | as R3                                                                                                                 |
| S19 | SOS aerosols / aerosol time series                                                     | `https://svs.gsfc.nasa.gov/5552/`, `/5572/`                                                                                                                                                                                                                          | equirect (1024×512 preview)                       | 2024-08-01 → 09-14                                   | Direct                                      | ✅ (related list)                       | as R5                                                                                                                 |
| S20 | SOS air quality + daily GEOS maps                                                      | `https://svs.gsfc.nasa.gov/5518/`, `/5147/`…`/5154/`                                                                                                                                                                                                                 | 2048×1024                                         | 2024; daily to 2026-11-13                            | Direct                                      | ✅ API                                  | as R6                                                                                                                 |
| S21 | Full-res BMNG / topo / bathy / cloud originals on Visible Earth                        | `eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/…`, `/73934/gebco_08_rev_elev_21600x10800.png`, `/73963/gebco_08_rev_bath_21600x10800.png`, `/57000/57747/cloud_combined_2048.jpg`                                                                           | up to 21600×10800                                 | static                                               | Direct                                      | ❌ TLS EOF from box (try from a laptop) | "NASA Earth Observatory / Reto Stöckli"                                                                               |
| S22 | ASTER GDEM shaded relief                                                               | GIBS `ASTER_GDEM_Greyscale_Shaded_Relief`                                                                                                                                                                                                                            | 31.25 m                                           | static                                               | WMS                                         | ✅ sample                               | Shaded relief image, not elevation values                                                                             |
| S23 | GEOS-CF raw NetCDF                                                                     | `https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/`                                                                                                                                                                                                            | 0.25°                                             | 2018→                                                | Direct (no key, large)                      | ❌ timeout from box                     | NASA GMAO                                                                                                             |
| S24 | ISS LIS raw science NetCDF                                                             | `https://ghrcdrive.nsstc.nasa.gov/pub/lis/iss/data/science/final/nc/`                                                                                                                                                                                                | points (lat, lon, time, radiance)                 | 2017–2023                                            | Direct (verify if Earthdata login required) | ❌ timeout from box                     | Blakeslee 2020, GHRC                                                                                                  |
| E1  | GISTEMP v4                                                                             | `https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv`                                                                                                                                                                                                    | annual global                                     | 1880→                                                | Direct                                      | ✅ 200                                  | BUILD_BRIEF §5.5                                                                                                      |
| E2  | NOAA GML Mauna Loa CO₂                                                                 | `https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv`                                                                                                                                                                                                       | monthly                                           | 1958→                                                | Direct                                      | not re-tested                           | BUILD_BRIEF §5.5                                                                                                      |
| E3  | NSIDC Sea Ice Index v4                                                                 | `…/G02135/north/monthly/data/N_09_extent_v4.0.csv`                                                                                                                                                                                                                   | monthly                                           | 1979→                                                | Direct                                      | not re-tested                           | BUILD_BRIEF §5.5                                                                                                      |
| E4  | FIRMS VIIRS 375 m                                                                      | Area API (needs **`FIRMS_MAP_KEY`**)                                                                                                                                                                                                                                 | points                                            | 2012→                                                | API key                                     | not tested (no key)                     | FIRMS ack                                                                                                             |

---

## 3. Classification (verdict, reason, feature, ESL mapping)

Features: **AM** Audio Map · **TT** Time Travel · **Q** Guess the Earth · **SY** Earth Symphony · **IN** intro story · **GV** globe visuals. ESL: WHERE→pan/HRTF, HOW MUCH→pitch, HOW STRONG→volume, HOW FAST→rhythm, WHAT→timbre.

| ID                                          | Verdict          | One-line reason                                                                                                      | Feeds                             | ESL mapping                                                                                                                                               |
| ------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 EIC gallery                              | use              | Curated index of EIC visuals; source of `eic.page` links and more pieces (Dixie Fire, daily viz)                     | IN, /data page                    | none (links)                                                                                                                                              |
| R2 Caldwell 73                              | use (design ref) | NASA's own sonification grammar: radar sweep = position, radius → pitch, color → instrument. Validates our ESL       | How-it-sounds, AM "sweep" mode    | Copies its idea: sweep angle = WHERE (pan), distance → pitch, category → timbre                                                                           |
| R3 Night lights 5313                        | **core**         | Real 2012→2023 change, purple/orange more/less, regional zooms (incl. Eastern Mediterranean)                         | TT, Q, GV, IN, AM                 | brightness → pitch; change sign → timbre (brighter = glass bell, dimmer = low pad); \|change\| → volume; lit-cell density along sweep → rhythm; lon → pan |
| R4 ECCO2 SST + currents 3912                | **core**         | Only official resource shipped as **equirectangular** frames (2048×1024 & 6840×3420) → drops straight onto the globe | GV, AM, TT (2007–08 seasonal), IN | SST (decoded via `sst_ecco2_cbar.png`, 0–32 °C) → pitch; lat → HRTF elevation; seasonal Δ → rhythm; timbre "water" (soft FM)                              |
| R5 GEOS aerosols 5669 (+5572/5552)          | **core**         | Four aerosol species with distinct colors = four timbres, the cleanest WHAT demo                                     | AM, SY, GV, IN                    | species → timbre (sea salt = airy flute, dust = grainy noise-pad, smoke = low brass, sulfate = glassy bell); intensity → volume; lon → pan                |
| R6 Air quality 5533 (+5518, 5147–5154)      | **core**         | PM2.5 / O₃ / CO / NOₓ over Cairo & world; daily maps up to today                                                     | AM, SY, Q, GV                     | each pollutant = one voice of a chord; concentration → pitch per voice; exceedance band → volume accent; day-to-day Δ → rhythm                            |
| R7 Perpetual Ocean 2 5425 (+5505/5479/5529) | use              | Stunning 3D currents 2021–2023 with temperature 0–25 °C and salinity 33–36 colorbars; equirect alt exists            | IN (hero), GV ocean view          | salinity → timbre brightness (filter cutoff); temperature → pitch; deep counter-current (600 m+) → bass voice                                             |
| R8 DYAMOND CO₂ 5196                         | optional         | Perspective-only, 3 months of 2020, model; great day-night "breathing" clip, no equirect                             | IN, SY narration                  | diurnal pulse → rhythm (story only; numbers stay Mauna Loa)                                                                                               |
| R9 ISS LIS lightning 5011                   | **core**         | Discrete events = rhythm; SOS equirect 4096×2048 movie                                                               | AM, TT, SY (percussion), GV       | flash count per cell/step → rhythm (ticks); radiance → volume; lon → pan; timbre = percussive click + filtered noise "thunder"                            |
| R10 Atmospheric river 4960                  | optional         | One 3D MERRA-2 event; heavy movies but 68.6 MB webm + captions; perspective only                                     | IN chapter, precipitation story   | moisture transport → pad swell (story only); pair with IMERG (S11) for real numbers                                                                       |
| R11 GEDI forest height 4950                 | use              | Perspective frames, but the same product exists as a 1 km gridded GIBS layer (S10) → real values + displacement      | GV forest view, AM, Q             | canopy height m → pitch; std-dev → timbre roughness (detune); footprint count → volume (confidence); height → globe displacement                          |
| S1 BMNG day                                 | **core**         | Real NASA day texture at any size via GIBS                                                                           | GV base                           | —                                                                                                                                                         |
| S2 BMNG shaded relief + bathymetry          | **core**         | Ocean-depth coloring and relief shading for the "data views" base                                                    | GV base (data views)              | —                                                                                                                                                         |
| S3 ETOPO 2022                               | **core**         | The only true height + bathymetry grid → displacement, normal map, water mask, specular                              | GV all views; AM "terrain" earcon | elevation → optional low drone pitch in AM terrain mode                                                                                                   |
| S4 Black Marble 2012/2016                   | **core**         | Night-side emissive texture **and** a real before/after pair                                                         | GV night side, TT, Q              | as R3                                                                                                                                                     |
| S5 City Lights 2012                         | skip             | Same as Black Marble 2012                                                                                            | —                                 | —                                                                                                                                                         |
| S6 MUR SST daily                            | **core**         | 2002→2026 daily, 1 km, exact numeric decode (100% tested) → real SST history                                         | AM, TT, Q, GV ocean               | as R4, plus anomaly vs same calendar day 2003 → volume                                                                                                    |
| S7 MERRA-2 AOD monthly                      | use              | 46 years of monthly aerosol history for Time Travel                                                                  | TT, Q, GV                         | AOD → pitch + volume; month Δ → rhythm                                                                                                                    |
| S8 MERRA-2 2 m temperature                  | use              | Replaces watermarked SAMPLE temperature frames with real monthly maps                                                | GV, TT                            | visual only; numbers stay GISTEMP (E1)                                                                                                                    |
| S9 LIS climatology + ISS daily              | use              | Real lightning texture + 2017–2021 daily counts                                                                      | GV, TT, AM                        | as R9                                                                                                                                                     |
| S10 GEDI L3/L4B grids                       | use              | Values for R11 view; L4B biomass optional bass                                                                       | GV, AM, Q                         | as R11; biomass → bass register                                                                                                                           |
| S11 IMERG precipitation                     | optional         | Rain story with R10; daily to 2026-11-11                                                                             | IN, AM                            | rain rate → rhythm density + volume; timbre = rain ticks                                                                                                  |
| S12 AMSR2 sea-ice concentration             | use              | Real textures for existing sea_ice layer (Sept 2012–2024)                                                            | GV, TT                            | visual; numbers stay NSIDC (E3)                                                                                                                           |
| S13 GIBS fire vector tiles                  | optional         | Key-free fallback for fire points if `FIRMS_MAP_KEY` is late                                                         | GV, AM                            | as wildfire layer                                                                                                                                         |
| S14 AIRS CO₂                                | optional         | Spatial CO₂ 2002–2012 texture only; short                                                                            | GV co2                            | visual only                                                                                                                                               |
| S15 MERRA-2 dust PM2.5                      | optional         | Dust voice history for aerosols                                                                                      | AM, TT                            | dust → grainy-noise voice volume                                                                                                                          |
| S16 Dixie Fire 4993                         | optional         | Story clip for wildfire; perspective movie                                                                           | IN                                | none                                                                                                                                                      |
| S17 PO2 equirect 5505                       | use              | Ocean-currents overlay on the globe                                                                                  | GV ocean                          | as R7                                                                                                                                                     |
| S18 SOS night lights 5475                   | use              | Equirect night-lights change map 2048×1024                                                                           | GV, TT                            | as R3                                                                                                                                                     |
| S19 SOS aerosols 5552/5572                  | use              | Equirect aerosol frames for the globe                                                                                | GV, TT                            | as R5                                                                                                                                                     |
| S20 SOS AQ 5518 + daily 5147–5154           | use              | Equirect AQ frames + "today" maps                                                                                    | GV, AM                            | as R6                                                                                                                                                     |
| S21 Visible Earth full-res originals        | optional         | 21600×10800 masters; unreachable from box today; GIBS covers it                                                      | GV (8K+ only)                     | —                                                                                                                                                         |
| S22 ASTER GDEM shaded relief                | skip             | Shaded image, not elevation; 31 m tiles are overkill                                                                 | —                                 | —                                                                                                                                                         |
| S23 GEOS-CF raw NetCDF                      | optional         | True AQ numbers; large, unreachable from box                                                                         | AM                                | as R6                                                                                                                                                     |
| S24 ISS LIS raw NetCDF                      | optional         | True flash points; unreachable from box                                                                              | AM, SY                            | as R9                                                                                                                                                     |
| E1–E4 existing                              | **core**         | Already in base MVP contracts                                                                                        | all                               | per BUILD_BRIEF §4–5                                                                                                                                      |

### 3.1 Every meaningful variable → visual channel + sound channel

| Layer id (new ids in **bold**) | Variable (unit)                                                                               | Source                                         | Visual channel                                            | Sound channel                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| **night_lights**               | night brightness index (0–255, image-derived from GIBS, **not calibrated radiance**; decided) | S4, R3/S18                                     | emissive night texture intensity                          | HOW MUCH → pitch                                               |
|                                | change 2012→2016 / 2012→2023 (sign, magnitude)                                                | S4 diff; R3 purple/orange classes              | diverging ramp purple↔orange; before/after wipe           | sign → WHAT timbre; magnitude → HOW STRONG                     |
|                                | lit-area fraction per region                                                                  | S4 threshold                                   | region outline glow                                       | HOW FAST → rhythm density                                      |
| **ocean_sst**                  | SST (°C, 0.15 °C bins)                                                                        | S6                                             | colormap overlay (GIBS ramp)                              | HOW MUCH → pitch                                               |
|                                | anomaly vs same day 2003 (°C)                                                                 | S6 two dates                                   | diverging ramp in before/after mode                       | HOW STRONG → volume                                            |
|                                | day/season Δ (°C)                                                                             | S6 series                                      | frame crossfade speed                                     | HOW FAST → rhythm                                              |
|                                | latitude                                                                                      | grid                                           | camera tilt                                               | WHERE → HRTF elevation                                         |
| **ocean_currents**             | surface flow (direction only, from frames)                                                    | R4, S17                                        | animated flow texture / video texture                     | none numeric (no fake speeds); ambient "swell" bed tied to SST |
|                                | SST along flows (°C)                                                                          | R4 colorbar decode                             | flow color                                                | pitch (via ocean_sst rules)                                    |
|                                | salinity (33–36)                                                                              | R7/5479 colorbar decode (if equirect verified) | flow color alt ramp                                       | timbre brightness (filter cutoff)                              |
|                                | deep vs surface (>600 m)                                                                      | R7 layers                                      | blue deep trails                                          | bass voice on/off                                              |
| **aerosols**                   | AOD (unitless)                                                                                | S7                                             | sequential ramp overlay                                   | pitch + volume                                                 |
|                                | species: sea salt / dust / smoke / sulfate                                                    | R5, S19 color classes                          | the four SVS colors                                       | WHAT: four timbres                                             |
|                                | dust PM2.5 (µg/m³)                                                                            | S15                                            | dust-only ramp                                            | dust voice volume                                              |
| **air_quality**                | PM2.5, O₃, CO, NOₓ                                                                            | R6/S20 colorbar decode                         | per-pollutant ramp; chip switcher                         | one voice each (chord); concentration → pitch                  |
|                                | exceedance of WHO guideline (PM2.5 15 µg/m³ 24 h)                                             | derived from decoded values                    | pulsing outline                                           | accent / volume bump                                           |
| **lightning**                  | flash count / rate                                                                            | S9                                             | glowing points/heat texture                               | HOW FAST → ticks per step                                      |
|                                | flash radiance                                                                                | S9 `LIS_ISS_Flash_Radiance`                    | point brightness                                          | HOW STRONG → volume                                            |
| **forest_height**              | canopy height RH100 (m)                                                                       | S10                                            | green ramp + vertex displacement (×exaggeration, labeled) | pitch                                                          |
|                                | height std-dev (m)                                                                            | S10                                            | roughness / normal intensity                              | timbre detune                                                  |
|                                | footprint count                                                                               | S10                                            | opacity (confidence)                                      | volume                                                         |
|                                | biomass density (Mg/ha)                                                                       | S10 L4B                                        | alt ramp                                                  | bass voice                                                     |
| temperature                    | anomaly (°C)                                                                                  | E1 numbers; S8 frames                          | S8 2 m temperature ramp                                   | per BUILD_BRIEF                                                |
| sea_ice                        | extent (M km²)                                                                                | E3; S12 frames                                 | concentration texture on polar cap                        | per BUILD_BRIEF                                                |
| co2                            | ppm                                                                                           | E2; S14 / R8 visuals                           | AIRS ramp; DYAMOND clip                                   | per BUILD_BRIEF                                                |
| wildfire                       | count, FRP                                                                                    | E4 / S13                                       | fire points                                               | per BUILD_BRIEF                                                |
| **precipitation** (optional)   | rain rate (mm/h)                                                                              | S11                                            | blue ramp                                                 | rhythm density + volume, rain-tick timbre                      |
| (all)                          | elevation / depth (m)                                                                         | S3                                             | displacement + normal + bathymetry shading                | AM terrain earcon (optional drone)                             |

---

## 4. Globe: one view per dataset

### 4.1 Shared texture set (built once by `pipeline/earth_pipeline/textures.py`)

| Asset                | Source                                                  | Desktop                                                                                              | Mobile / low tier            | Fallback                | Notes                                                                                                |
| -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `earth-day`          | S1 BMNG                                                 | **4096×2048 KTX2 (default)**; 8192×4096 KTX2 on strong desktops only (UASTC→BC7/ASTC), target ≤ 8 MB | mobile 2048×1024 KTX2 ≤ 1 MB | 2048×1024 WebP ≤ 600 KB | Replaces `public/textures/earth-day.jpg`                                                             |
| `earth-relief-bathy` | S2                                                      | **4096×2048 KTX2 (default)**; 8192×4096 KTX2 on strong desktops only                                 | mobile 2048×1024 KTX2        | 2048 WebP               | Base for "data views" (muted, desaturated in shader)                                                 |
| `earth-night`        | S4 2016                                                 | **4096×2048 KTX2 (default)**; 8192×4096 KTX2 on strong desktops only (ETC1S, single channel ok)      | mobile 2048×1024 KTX2        | 2048 WebP               | Emissive on dark side                                                                                |
| `earth-night-2012`   | S4 2012                                                 | 4096×2048                                                                                            | 2048×1024                    | —                       | Before/after only                                                                                    |
| `earth-height`       | S3 ETOPO 2022 60″                                       | 4096×2048 **R16 PNG → KTX2 R16/RG8** (range −10,900…+8,800 m, store offset/scale in config)          | 2048×1024 R8                 | none (flat sphere)      | Displacement (exaggeration default 0.012 R land / 0.006 R ocean, user slider, labeled "exaggerated") |
| `earth-normal`       | derived from S3 (built at 8192×4096, downsampled to 4K) | **4096×2048 KTX2 (default)**; 8192×4096 KTX2 on strong desktops only RG (BC5)                        | mobile 2048×1024 KTX2        | 2048 WebP               | Lighting detail without dense mesh                                                                   |
| `earth-water-mask`   | S3 (elev < 0)                                           | 4096×2048 R8                                                                                         | 2048                         | —                       | Ocean specular, overlay masking (SST only on water, forest only on land)                             |
| `ramp-<name>`        | GIBS colormap XML / SVS colorbar PNG                    | 256×1 PNG                                                                                            | same                         | —                       | GPU colorization of value textures                                                                   |
| clouds               | none verified                                           | —                                                                                                    | —                            | —                       | **Skip** unless S21 `cloud_combined_2048.jpg` downloads from a laptop; never invent clouds           |

Mesh: sphere 512×256 segments desktop high tier, 256×128 default, 128×64 mobile; drei `<Detailed>` LOD at camera distance 1.6R / 2.5R / 4R. Displacement only on the high/default tiers.

### 4.2 Per-view spec (`public/data/views/{id}.view.json`)

| View                 | Base                              | Overlay (value texture → ramp)                                           | Height                                                                  | Ramp                                                                             | Camera preset (lat, lon, alt in R)                                                                | Time Travel frames                                                                                                                                                     | Before/after                                                                                                  |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| home                 | earth-day + earth-night (sun-lit) | none                                                                     | ETOPO                                                                   | —                                                                                | 20, 31, 2.8 (Africa/Egypt facing)                                                                 | —                                                                                                                                                                      | —                                                                                                             |
| night_lights         | earth-relief-bathy (dimmed 85%)   | S4 brightness (R8 2048×1024), R3/S18 change classes                      | ETOPO                                                                   | `night-gold` sequential; `change-purple-orange` diverging (from SVS 5313 legend) | 30, 31, 1.9 (Eastern Mediterranean / Nile) ; presets India 22,79 · Ukraine 49,32 · W. Europe 48,5 | 2012, 2016 (GIBS) + annual 2012–2023 from R3/S18 _only if projection verified_                                                                                         | 2012 ↔ 2016 wipe; 2012 ↔ 2023 change map                                                                      |
| ocean_sst            | earth-relief-bathy                | S6 SST (R8 2048×1024, value = bin index) masked to water                 | ETOPO bathymetry shading                                                | GIBS `GHRSST_Sea_Surface_Temperature` colormap                                   | 35, −65, 2.0 (Gulf Stream); Agulhas −38, 22; Kuroshio 35, 140                                     | 15 Feb & 15 Aug each year 2003–2025 (46 frames) + daily week for "now"                                                                                                 | 2003-08-15 ↔ 2025-08-15                                                                                       |
| ocean_currents       | earth-relief-bathy                | R4 frames 2048×1024 (WebP sequence) or PO2 equirect S17 as video texture | ETOPO                                                                   | baked (SVS) + SST/salinity legend                                                | same as ocean_sst                                                                                 | R4 2007-03 → 2008-03 subsample every 7th frame                                                                                                                         | — (model period only)                                                                                         |
| aerosols             | earth-day (desaturated 50%)       | S7 AOD (R8 1024×512) + species texture S19/R5                            | none                                                                    | `aod-sequential` (GIBS colormap) + 4-class species legend (SVS)                  | 15, −20, 2.5 (Saharan dust over Atlantic)                                                         | Aug each year 1980–2026 + monthly last 36 months                                                                                                                       | 1980-08 ↔ 2025-08                                                                                             |
| air_quality          | earth-day (desaturated)           | S20 daily maps per pollutant (2048×1024)                                 | none                                                                    | per-pollutant SVS colorbar                                                       | 30.0, 31.2, 1.6 (Cairo) ; Delhi 28.6, 77.2                                                        | R6 2024-07-01 → 09-14 (every 3rd day, ~25 frames) + latest day                                                                                                         | July 1 ↔ Sept 14 2024                                                                                         |
| lightning            | earth-night (dim)                 | S9 climatology heat (1024×512) + seasonal ISS composites                 | ETOPO                                                                   | `flash-ice-white`                                                                | 9.8, −71.6, 2.2 (Lake Maracaibo); Congo −2, 25                                                    | **seasonal set (decided)**: 18 seasons MAM 2017 → JJA 2021; each frame sums one 10-day mid-season window (matches SVS 5011's 10-day roving window) ≈ 180 GIBS requests | climatology ↔ selected season (each frame records `n_days` actually available; missing days are never filled) |
| forest_height        | earth-day                         | S10 RH100 (R8 2048×1024, 1 km downsampled) masked to land                | **ETOPO + canopy height added to displacement** (separate exaggeration) | `canopy-green` 0–50 m (matches SVS 4950 legend)                                  | 0, 20, 1.8 (Congo); Amazon −5, −60                                                                | 5 cumulative windows (coverage growth, labeled as such)                                                                                                                | none (no change data)                                                                                         |
| temperature          | earth-relief-bathy                | S8 2 m temp monthly (1024×512)                                           | none                                                                    | `temp-diverging`                                                                 | 20, 30, 2.8                                                                                       | July every 5th year 1980–2025 (matches MVP crossfade)                                                                                                                  | 1980-07 ↔ 2025-07                                                                                             |
| sea_ice              | earth-relief-bathy                | S12 concentration (1024×1024 polar crop baked to equirect)               | ETOPO                                                                   | `ice-white-blue`                                                                 | 80, 0, 2.2                                                                                        | 15 Sep 2012–2024 (13)                                                                                                                                                  | 2012 ↔ 2024                                                                                                   |
| co2                  | earth-day                         | S14 AIRS monthly (≤ 2012)                                                | none                                                                    | `co2-sequential`                                                                 | 20, 0, 3.0                                                                                        | Jan & Jul 2003–2011                                                                                                                                                    | 2003 ↔ 2011                                                                                                   |
| wildfire             | earth-day                         | points (E4 or S13 MVT)                                                   | ETOPO                                                                   | `fire-heat`                                                                      | 38, 22, 1.8                                                                                       | per BUILD_BRIEF                                                                                                                                                        | —                                                                                                             |
| precipitation (opt.) | earth-day                         | S11 IMERG daily                                                          | none                                                                    | GIBS IMERG colormap                                                              | 30, −140, 2.6                                                                                     | AR event days                                                                                                                                                          | —                                                                                                             |

**Transitions:** switching view = 900 ms (reduced motion: 0 ms crossfade, no camera fly). Sequence: fade overlay out (250 ms) → slerp camera to preset with GSAP (600 ms, `power2.inOut`) → swap ramp texture and fade overlay in (250 ms). Height exaggeration tweens. The Audio Map announces the view change via `aria-live` before the sound starts.

### 4.3 Shaders (`src/modules/globe/shaders/`): extend the existing displaced globe

`develop` already has vertex displacement, a fresnel atmosphere and note pulses, driven by a procedural texture. Keep that structure and these effects. Replace the procedural inputs with the real textures from §4.1, and add the uniforms below. If an item already exists (atmosphere, displacement), only change its input or parameters.

1. **`earth.vert`** – existing displacement; switch its source from procedural noise to real height: `pos += normal * (h * uExag + canopy * uCanopyExag)`; `h` from `earth-height` (decode with offset/scale uniforms). Skip when tier = low.
2. **`earth.frag`** –
   - `dayMix = smoothstep(-0.12, 0.18, dot(N, uSunDir))`;
   - `color = mix(night * uNightGain, day, dayMix)`; ocean specular = water-mask × Blinn-Phong; normal map from `earth-normal`;
   - data overlay: `v = mix(texture(uFrameA), texture(uFrameB), uFrameT)` (value textures, R channel) → `rampColor = texture(uRamp, vec2(v, .5))`; `alpha = uOverlayOpacity * validMask` (nodata bin 0 → transparent);
   - **before/after**: `side = step(uSplitLon, lon)` picks frame A or B; animated split line (or radial reveal from the focused region);
   - **sound sync playhead** (reuse the existing note-pulse mechanism; the pulse position comes from the decoded cell being played): `glow = exp(-pow((lon - uPlayheadLon)/uWidth, 2))` brightens the meridian/cell being sonified; `uPlayheadLon` comes from the score clock (§4.4);
   - colorblind-safe ramps only; never encode meaning in hue alone (pattern/contour option in Visual mode).
3. **`atmosphere`** – **already exists (fresnel)**. Only tune it: tint toward the sun side and keep a back-face sphere at 1.025R, Fresnel `pow(1. - dot(V, N), 3.)` × Rayleigh-ish blue `vec3(0.3,0.6,1.0)`, sun-side brightened, additive blending; separate front-face haze on the limb.
4. **Night lights** – emissive only where `dayMix < 0.5`; in night_lights view, emissive across the whole globe with day base dimmed.
5. **Flow video** (ocean_currents) – `THREE.VideoTexture` from a 2048×1024 WebM made from R4 frames; paused when audio paused; frame index driven by Time Travel (seek), not free-running, so sound and picture agree.

### 4.4 Sound ↔ picture sync (single clock)

- `score.ts` already emits steps with `t`. Add `onStep(step)` → zustand `globe.sync = { t, frameA, frameB, frameT, playheadLon, region }`.
- Time Travel slider sets `t`; loader prefetches frames `t±2` (LRU of 6 value textures per view).
- When the slider scrubs, audio plays the step at `t` _and_ the shader crossfades to the same `t`. One source of truth: `store.time`.
- Before/after mode plays A then B (two bars each) while `uSplitLon` sweeps; screen-reader caption: "Before: 2012 … After: 2016, brighter by …" from decoded values.

### 4.5 Performance budgets (summary; §10 is authoritative)

- First load (landing + intro): ≤ 2.5 MB JS gz, ≤ 3 MB textures (2K WebP base + night), LCP ≤ 2.5 s on mid-tier mobile.
- Per-view lazy load: ≤ 6 MB (4K KTX2 base upgrade + first 3 frames); strong-desktop 8K upgrade ≤ +12 MB, fetched after the 4K view is interactive. Frames streamed, never all at once.
- Data frames: value textures R8 2048×1024 PNG/WebP-lossless ≤ 300 KB (1024×512 ≤ 100 KB); colorized WebP previews ≤ 250 KB for the flat "EIC panel".
- Value grids for sonification/probing: 720×360 Uint8 (bin index) + per-layer `bins[]` from colormap → ≤ 260 KB raw, gz ~60–120 KB, per frame.
- GPU memory: ≤ 256 MB desktop, ≤ 96 MB mobile. **4K is the default everywhere (decided).** 8K only on a "strong desktop" = not mobile/coarse pointer, `maxTextureSize ≥ 8192`, KTX2 BC7/ASTC transcode supported, `navigator.deviceMemory ≥ 8` (when exposed) and the first 4K view held ≥ 55 fps for 3 s; Settings has an override ("Texture quality: Auto / 4K / 8K").
- 60 fps desktop / 30 fps mobile; `frameloop="demand"` when idle; DPR cap 2 (1.5 mobile).
- Tooling: `toktx` (KTX-Software) or `basisu` for KTX2; drei `useKTX2` with the transcoder in `/public/basis/`; `sharp` for WebP.
- Repo size: commit only ≤ 2K assets + JSON; **4K/8K KTX2 textures and frame sequences go to GitHub Release assets (decided), served to browsers through a CORS-capable mirror (§14)**, e.g. release tag `data-v1` on `HassenTMLCSSJS/earth-listens`. A generated `public/data/assets.manifest.json` lists `{name, url, bytes, sha256, tier}`; the loader verifies size/hash and falls back to the 2K in-repo WebP if a download fails. No Git LFS. Verified 2026-11-13: GitHub release downloads send **no CORS header**, so they're mirrored to the asset host (§14) and the browser never loads them directly. Uploading release assets is a publishing step and needs Hassan's OK.

---

## 5. Python pipeline additions (`pipeline/earth_pipeline/`)

All modules: pure functions + thin CLI, `--dry-run` prints URLs only, every download recorded in `raw/manifest.json` (`url, retrieved (ISO, UTC), sha256, bytes, source_id`). `raw/` stays git-ignored. Add deps: `requests`, `pillow`, `numpy`, `rasterio` (ETOPO only), `lxml`; system: `ffmpeg`, `toktx`.

| Module            | Functions                                                                                                                                                                                                                                                                                                                     | Notes                                                                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gibs.py`         | `capabilities(cache=True)`, `layer_info(id) -> {tile_matrix_set, times[], formats[], colormap_url}`, `wms_url(layer, time, w, h, fmt)`, `fetch_wms(...) -> Path`, `load_colormap(url) -> Colormap(entries=[(rgb, lo, hi, nodata)], units)`, `decode(img, cmap) -> (bin_idx uint8, values float32 NaN)`, `hit_rate(img, cmap)` | Raise if `hit_rate < 0.99`, then retry via WMTS native tiles. Bin value = interval midpoint; open-ended bins (`[-INF,0)`) clamp to the finite edge and are flagged `q:"estimated"`.           |
| `svs.py`          | `api(id) -> dict` (cache JSON in `raw/svs/{id}.json`), `media(meta, kind, min_w, name_like) -> list`, `download(url, max_bytes=200_000_000)`                                                                                                                                                                                  | Refuse `.mov`/ProRes and anything > `max_bytes` unless `--allow-large`. Credits & dataset list copied into `source`.                                                                          |
| `etopo.py`        | `download_etopo(res="60s")`, `to_equirect(path, w, h) -> int16 meters` (area-average), `write_height_png16`, `normal_map(height, strength)`, `water_mask(height)`                                                                                                                                                             | Output 8192×4096 normal, 4096×2048 height, 4096×2048 mask. Confirm exact file URL on the NCEI page at fetch time (not guessed here).                                                          |
| `textures.py`     | `build_base(layer, sizes=(2048,4096,8192))` via GIBS WMS (S1/S2/S4), `to_ktx2(png, mode)`, `to_webp(png, q)`, `release_manifest(paths, tag)` (writes `assets.manifest.json`; upload itself is a separate approved step via `gh release upload`)                                                                               | 8K WMS proven (24 s). Credit embedded in config, not burned in image.                                                                                                                         |
| `frames.py`       | `series_dates(layer, rule)` (e.g. `"YYYY-08-15"`, monthly), `build_frames(layer)` → value textures `public/frames/{id}/{t}.v.png`, previews `{t}.webp`, grids `public/data/grids/{id}/{t}.u8.bin`                                                                                                                             | Only dates present in GIBS capabilities; a missing date becomes `q:"missing"`, never interpolated silently.                                                                                   |
| `regions.py`      | `region_stats(values, bbox, lat_weighted=True) -> {mean, p5, p95, n_valid}`                                                                                                                                                                                                                                                   | Feeds `series` per region (Egypt, Africa, …) from decoded grids → AM, TT and quiz truth.                                                                                                      |
| `video_frames.py` | `extract(mp4, times)` (ffmpeg), `equirect_check(img)`                                                                                                                                                                                                                                                                         | Only for R4/R9/S17 equirect movies. Frame→date mapping must come from SVS metadata (date range + frame count) or the SVS "dates" layer; if not derivable, label frames "step n" with no date. |
| `svs_colorbar.py` | reuse `colorbar.build_lut` for SVS PNG colorbars (R4 `sst_ecco2_cbar.png` 0–32 °C, R7 temp/salinity, R5 species, R6 pollutants, R11 0–50 m)                                                                                                                                                                                   | Tick values typed in by a human from the colorbar image and checked in `pipeline/colorbars/*.json` with the PNG's SHA-256.                                                                    |
| `build.py`        | `--layer night_lights                                                                                                                                                                                                                                                                                                         | ocean_sst                                                                                                                                                                                     | ocean_currents | aerosols | air_quality | lightning | forest_height | precipitation | base_textures | etopo` | Prints proposed ranges, frame counts, total bytes vs budget (§4.5) and fails if over budget. |
| `validate.py`     | add: decoded GIBS SST vs ECCO2/R4 global mean sanity (r ≥ 0.8 over overlapping months is _not_ expected — different years; instead check plausible range −2…35 °C), AOD 0…5, canopy 0…80 m                                                                                                                                    | Plots to `docs/validation/`.                                                                                                                                                                  |

Example commands (dry-run first):

```
python -m earth_pipeline.build --layer base_textures --sizes 2048,4096,8192   # 2048 in repo; 4096 default + 8192 strong-desktop go to the release --dry-run
python -m earth_pipeline.build --layer etopo
python -m earth_pipeline.build --layer night_lights      # GIBS 2012 & 2016 + SVS 5475
python -m earth_pipeline.build --layer ocean_sst --rule "YYYY-02-15,YYYY-08-15" --from 2003 --to 2025
python -m earth_pipeline.build --layer aerosols --rule "YYYY-08-01" --from 1980 --to 2026 --plus-monthly 36
python -m earth_pipeline.build --layer lightning --aggregate seasonal --window-days 10 --from 2017-03 --to 2021-09   # 18 frames, ~180 requests
python -m earth_pipeline.build --layer forest_height     # 5 GEDI windows
```

---

## 6. Contracts (zod, `src/modules/data/schemas.ts`) — additive, backward compatible

```ts
export const LayerId = z.enum([
  'temperature',
  'wildfire',
  'sea_ice',
  'co2', // existing
  'night_lights',
  'ocean_sst',
  'ocean_currents',
  'aerosols',
  'air_quality',
  'lightning',
  'forest_height',
  'precipitation', // new (precipitation optional)
]);
export const Category = z.enum([
  'climate',
  'fire',
  'ice_ocean',
  'ocean',
  'atmosphere',
  'human',
  'biosphere',
  'weather',
]);

// New: one file per globe view, public/data/views/{id}.view.json
export const RampSchema = z.object({
  id: z.string(),
  src: z.string(), // /ramps/{id}.png (256x1)
  domain: z.tuple([z.number(), z.number()]),
  unit: LocalizedString,
  kind: z.enum(['sequential', 'diverging', 'categorical']),
  classes: z
    .array(
      z.object({
        value: z.number(),
        label: LocalizedString,
        rgb: z.tuple([z.number(), z.number(), z.number()]),
      }),
    )
    .optional(),
  source: z.string().url(), // GIBS colormap XML or SVS colorbar URL
});
export const CameraPreset = z.object({
  id: z.string(),
  label: LocalizedString,
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  alt: z.number().min(1.1).max(6),
});
export const ViewSchema = z.object({
  id: LayerId,
  base: z.enum(['earth-day', 'earth-relief-bathy', 'earth-night']),
  baseDim: z.number().min(0).max(1).default(0),
  night: z.boolean().default(true),
  height: z
    .object({
      src: z.string(),
      offset: z.number(),
      scale: z.number(),
      exaggeration: z.number(),
      canopy: z.object({ src: z.string(), exaggeration: z.number() }).optional(),
    })
    .nullable(),
  overlay: z
    .object({
      kind: z.enum(['value', 'video', 'points', 'baked']),
      mask: z.enum(['none', 'water', 'land']).default('none'),
      ramp: RampSchema.nullable(),
      opacity: z.number().min(0).max(1).default(0.85),
    })
    .nullable(),
  cameras: z.array(CameraPreset).min(1),
  beforeAfter: z
    .object({ a: TimeValue, b: TimeValue, mode: z.enum(['wipe', 'radial', 'toggle']) })
    .nullable(),
  transitionMs: z.number().int().default(900),
  credit: z.array(z.string()).min(1), // rendered in the on-globe credit line
});

// LayerDataSchema additions (all optional, so existing files stay valid)
export const FrameSchema = z.object({
  t: TimeValue, // number year | ISO date
  src: z.string(), // colorized preview (webp)
  value: z.string().optional(), // value texture (R8 png)
  grid: z.string().optional(), // /data/grids/{id}/{t}.u8.bin
  q: z.enum(['ok', 'missing', 'estimated']).default('ok'),
  sample: z.boolean().optional(), // must equal file-level sample
});
export const GridMeta = z.object({
  w: z.number().int(),
  h: z.number().int(),
  bins: z.array(
    z.object({ lo: z.number().nullable(), hi: z.number().nullable(), mid: z.number().nullable() }),
  ),
  nodata: z.number().int(),
  projection: z.literal('equirectangular'),
});
// LayerData: frames: z.array(FrameSchema); grid: GridMeta.optional();
// variables: z.record(z.string(), Series).optional()   // e.g. air_quality: { pm25, o3, co, nox }
// species: z.array(z.object({ id, label, timbre })).optional()   // aerosols
// source: add z.array(SourceSchema) allowed (multi-source layers), each with svs_id?: number, gibs_layer?: string
```

Refinements to add: `frames[].t` strictly increasing; every `frames[].value` file exists (checked in `validate-data.ts`); `grid.bins.length ≤ 256`; `sample:false` requires `source.retrieved` and `source.sha256` for every source; `credit` non-empty in every view.

Registry: add one entry per new layer plus `"view": "/data/views/{id}.view.json"`. **Still no engine code per layer** — the engine reads config + view.

Config examples (abbreviated):

```jsonc
// ocean_sst.config.json
{
  "id": "ocean_sst",
  "category": "ocean",
  "timeKind": "day",
  "variables": {
    "how_much": { "field": "v", "range": [-2, 32] },
    "how_strong": { "field": "abs(anom)", "range": [0, 4] },
    "how_fast": { "field": "delta(v)", "range": [-1.5, 1.5] },
    "where": { "field": "cell" },
  },
  "what": { "timbre": "water-fm", "register": [48, 84], "symphonyRegister": [55, 72] },
  "scale": "maqam_hijaz",
  "symphony": { "role": "pad", "from": 2003, "to": 2025 },
}
// Timbres: reuse develop's per-layer Tone.js presets; add only the new ids below to sonification/timbres.ts
// aerosols.config.json → "what": { "timbreBySpecies": { "sea_salt":"air-flute","dust":"grain-pad","smoke":"low-brass","sulfate":"glass-bell" } }
// lightning.config.json → "how_fast": { "field":"count", "range":[0,"p95"] }, "what":{"timbre":"thunder-perc"}
```

Ranges above are physical plausibility bounds; final ranges come from `build.py` robust p5–p95 output (never hand-tuned to look good).

---

## 7. Time Travel, before/after and the quiz (real data only)

- **Time Travel** per layer uses only dates in §4.2. Slider snaps to available frames; between frames the shader crossfades and audio uses the nearest real step (no interpolated numbers spoken).
- **Before/after**: views with `beforeAfter` get a "Compare" button (keyboard `C`). Audio: A (2 bars) → earcon → B (2 bars), then a spoken summary computed from region stats ("Egypt night brightness index (image-derived) rose from X to Y").
- **Guess the Earth**: new clip types from real pairs — night lights 2012→2016 (region), SST 2003→2025 Aug (region), AOD 1980→2025 Aug, sea-ice concentration 2012→2024, GEDI is excluded (no change data). `truth` computed by `scripts/generate-quiz-truth.ts` from region stats with a ±threshold for `unchanged`; a test re-computes it.
- **Earth Symphony**: add voices — lightning (percussion), aerosols (4 species), ocean_sst (pad), air_quality (chord). Register plan keeps the −6 dB per-voice ceiling and BUILD_BRIEF §4 limits.

---

## 8. Intro story: real footage in the existing 6 chapters

The Lenis/ScrollTrigger intro on `develop` already has 6 chapters. Don't add a new intro: map real media into those chapters (swap the stand-in visuals; keep the scroll timings). Suggested mapping, in order, all with SVS captions/credits: (1) Black Marble globe at night (S4) → (2) Perpetual Ocean 2 beauty clip 1080p (R7, ~25 s excerpt, WebM ≤ 8 MB re-encode) → (3) aerosols still 3840×2160 (R5) → (4) lightning SOS clip (R9) → (5) DYAMOND CO₂ breathing (R8, optional) → (6) atmospheric river with its `.vtt` captions (R10, optional) → land on the interactive globe. Each chapter keeps its existing EN/AR narration slot. Its sting reuses that layer's existing Tone.js timbre (add the new timbres from §6 only for new layers). Reduced motion: stills only.

---

## 9. Attribution (add to `ATTRIBUTION.md`, `/data` page, README; on-globe credit line per view)

- General: "Uses NASA data and visualizations; not endorsed by NASA."
- GIBS: "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)."
- SVS items: "Courtesy of NASA's Scientific Visualization Studio" + the per-item credit lines in §2.1 (R2–R11), with page URL.
- Blue Marble NG: "NASA Earth Observatory, Reto Stöckli (NASA GSFC)."
- Black Marble / night lights: "NASA Earth Observatory images by Joshua Stevens, using Suomi NPP VIIRS data from Miguel Román, NASA GSFC."
- ETOPO: "NOAA National Centers for Environmental Information. 2022: ETOPO 2022 Global Relief Model." (copy DOI from the NCEI page when downloading).
- MUR SST: "JPL MUR MEaSUREs Project. GHRSST Level 4 MUR Global Foundation Sea Surface Temperature Analysis, v4.1. PO.DAAC." (verify DOI on PO.DAAC).
- MERRA-2 / GEOS-FP / GEOS-CF: "NASA Global Modeling and Assimilation Office (GMAO)."
- ISS LIS: "Blakeslee, R. J. (2020), ISS LIS science data, NASA GHRC DAAC" (verify DOI).
- GEDI: "GEDI L3/L4B, Dubayah et al., NASA / University of Maryland, ORNL DAAC" (verify DOIs).
- ECCO2: "ECCO2 (MIT/JPL), MITgcm."
- IMERG (if used): "NASA GPM IMERG." AMSR2 (if used): "JAXA/NASA AMSR2."
- FIRMS: unchanged from BUILD_BRIEF §5.5.
- Open-Meteo (live weather/AQ): "Weather data by Open-Meteo.com" (CC BY 4.0); AQ adds "Contains modified Copernicus Atmosphere Monitoring Service information".
- OpenAQ (if used): "Air quality data from OpenAQ" plus each station's original provider.
- NOAA GML, NSIDC, NOAA NCEI ETOPO: as above. NASA EONET, POWER, EPIC (if used): "NASA EONET" / "NASA LaRC POWER Project" / "NASA EPIC Team".
- Natural Earth: "Made with Natural Earth" (public domain).
- Caldwell 73 (reference only): "Sonification: SYSTEM Sounds (M. Russo, A. Santaguida); NASA/ESA/G. Piotto."
- Third-party music in SVS produced videos (e.g. 14745, 14696) is **not** cleared for remix → do not use produced-video audio; use data-only visualization pages.

---

## 10. Performance plan: no lag on any dataset (supersedes the §4.5 numbers where they differ)

### 10.1 Budgets (enforced in CI where measurable, §12.4)

| Metric                                        | Mobile (tier 1)           | Laptop (tier 2, default)             | Strong desktop (tier 3)                 |
| --------------------------------------------- | ------------------------- | ------------------------------------ | --------------------------------------- |
| Base textures                                 | 2048×1024 KTX2            | **4096×2048 KTX2 (decided default)** | 8192×4096 KTX2 (decided, auto-detected) |
| GPU texture memory (all textures, incl. mips) | ≤ 96 MB                   | ≤ 192 MB                             | ≤ 384 MB                                |
| Frame time (render loop)                      | 30 fps floor: p95 ≤ 40 ms | 60 fps: p95 ≤ 25 ms                  | 60 fps: p95 ≤ 20 ms                     |
| Main-thread long tasks during playback        | none > 50 ms              | none > 50 ms                         | none > 50 ms                            |
| Texture upload in one frame                   | ≤ 4 ms (compressed only)  | ≤ 4 ms                               | ≤ 6 ms                                  |
| Sphere mesh                                   | 128×64, no displacement   | 256×128 + displacement               | 512×256 + displacement + canopy         |
| DPR cap                                       | 1.5                       | 2                                    | 2                                       |

Bytes and responsiveness (all tiers):

- **Landing (`/[locale]`) first load:** JS ≤ 200 KB gz (no three/Tone in this chunk); total transfer ≤ 1.5 MB including a 2K WebP poster; LCP ≤ 2.5 s, CLS ≤ 0.05, TBT ≤ 200 ms (Lighthouse mobile, simulated 4G).
- **`/[locale]/listen` first interaction:** route JS ≤ 450 KB gz including three, r3f/drei and Tone (each lazy chunk ≤ 250 KB gz); globe interactive ≤ 3.5 s on 4G mid-tier; INP ≤ 200 ms.
- **Per-view switch:** ≤ 6 MB transferred (4K tier), visible in ≤ 1 s from cache and ≤ 3 s cold; the 8K upgrade (≤ +12 MB) loads only after the 4K view is interactive.
- **Audio latency:** key/tap → audible onset ≤ 100 ms (target 50 ms) after the AudioContext has started; zero audio dropouts during view changes, frame swaps and scrubbing; at most 16 simultaneous voices, keeping the existing −6 dB per-voice ceiling.

GPU memory arithmetic (to size the tiers): a 4096×2048 BC7/ASTC 4×4 texture is 8 MB, or 10.7 MB with mips; ETC1S→BC1 is half that; 8192×4096 BC7 is 42.7 MB with mips. Tier 2 set: day + night + normal + height (BC4) + water mask + 2 overlay frames ≈ 45 MB. Tier 3 ≈ 150 MB. Uncompressed 8K RGBA would be 128 MB+, so **uncompressed 4K/8K is never allowed**.

### 10.2 Techniques

1. **Compressed textures:** KTX2 (Basis UASTC for color and normals, ETC1S for night and masks) via drei `useKTX2`/`KTX2Loader` with the Basis transcoder in `/public/basis/` (transcodes in a worker). **WebP fallback** when `KHR_texture_basisu` transcode targets are missing. Mipmaps are generated in the pipeline (`toktx --genmipmap`), not in the browser.
2. **Tiled level of detail:** global base texture, plus **regional detail patches** for close camera presets (e.g. Cairo/Nile 2048×2048 from GIBS WMS bbox, fetched on approach). Full WMTS quadtree streaming on the sphere is a stretch goal; for map close-ups use GIBS WMTS tiles at the needed zoom (`/{z}/{row}/{col}`) on a flat inset.
3. **Lazy loading per view:** each view's textures, frames, ramp and adapter code load in a dynamic `import()` when the view is selected. Idle-time prefetch is limited to the next view in the guided order.
4. **Worker decoding:** `decode.worker.ts` turns value grids (Uint8 bins → Float32 + NaN) into region stats and score inputs. `createImageBitmap` decodes WebP off the main thread. **OffscreenCanvas** in the worker builds 256×1 ramp textures and colorized 2D previews (Visual-mode fallback and screen-reader "describe" thumbnails).
5. **Frame sequences:**
   - short value series (lightning: 18 seasonal frames; GEDI: 5; night lights: 2–13) → one WebGL2 **`DataArrayTexture`** (texture array): 18 × 1024×512 R8 ≈ 9.4 MB, a single upload, and the crossfade picks two layer indices;
   - long series (SST 46, AOD ~83, temperature ~10) → **streamed** value textures, prefetching only adjacent frames (±1 on mobile, ±2 elsewhere), LRU of 6 per view;
   - flow animations (ECCO2/PO2) → **video textures** (WebM VP9 + MP4 H.264 fallback, ≤ 8 MB), seeked by the Time Travel clock, not free-running.
6. **Adaptive quality:** drei `<PerformanceMonitor>` (on decline: lower DPR → drop displacement → 8K→4K → fewer flow particles; on incline: step back up with hysteresis) plus `<AdaptiveDpr>`. A device-tier check at startup uses `maxTextureSize`, `navigator.deviceMemory`, `hardwareConcurrency`, coarse pointer and optionally `detect-gpu` (pmndrs). Settings has a "Texture quality: Auto / 4K / 8K" override (decided). `frameloop="demand"` when nothing animates.
7. **Audio scheduling off the render loop:** all notes are scheduled on `Tone.getTransport()` with a lookahead (`Tone.getContext().lookAhead = 0.1`, `latencyHint: "interactive"`). The render loop only **reads** the audio clock (`Tone.now()`) to place the playhead and note pulses; it never triggers sound. Score building (`buildScore`) runs in the worker for large grids. Score output is unchanged: **same data snapshot → identical score** (determinism tests in §12.4).
8. **Caching:**
   - **service worker** (Serwist for Next.js): precache the app shell, 2K textures, ramps and the demo dataset, so `?demo=1` works fully offline; runtime **CacheFirst** for content-hashed assets; **StaleWhileRevalidate** for live feed JSON;
   - **immutable headers:** `Cache-Control: public, max-age=31536000, immutable` on hashed files (`/assets/*.{hash}.ktx2`, frames, grids); live JSON gets `s-maxage=<revalidate>, stale-while-revalidate=86400`;
   - **CDN:** Vercel's edge for the app and JSON; large binaries from the asset host (§14).
9. **CI gates:** Lighthouse CI budgets and `size-limit` on JS chunks; a Playwright perf smoke test (§12.4).

## 11. Real time: live data where the sources allow it

### 11.1 Architecture (same pattern for every feed)

```
browser ──> /api/live/[feed]  (Next.js route handler; Node runtime when decoding PNGs, else edge)
              │  fetch(upstream, { next: { revalidate: N } })  → zod-validated FeedEnvelope
              │  on error/timeout(8 s)/429 → last good snapshot
              ▼
        Vercel edge cache (s-maxage=N, stale-while-revalidate=86400)

GitHub Action "snapshot" (cron every 3 h; public repo = free minutes)
   → runs scripts/snapshot.ts for every feed → writes snapshots/{feed}/latest.json + {date}.json
   → publishes them to the asset host (§14), and on success triggers revalidation of /api/live/*
Vercel Cron (Hobby plan: once per day max, verified) → daily backup run of the same refresh
```

- **One request upstream per revalidate window**, no matter how many visitors. Keys stay server-side (`src/server/feeds/*`, `import "server-only"`).
- **FeedEnvelope** (zod): `{ feed, status: "live"|"recent"|"snapshot"|"demo", dataTime, fetchedAt, source:{name,url,license}, latencyNote, items|grid }`.
- **Fallback chain:** live route → last good snapshot on the asset host → snapshot bundled at build time (`public/data/snapshots/`) → **`?demo=1`** (bundled only, zero network, unchanged).
- **Freshness label in the UI** (visible chip + `aria-live` text, Cairo time UTC+2): "Live · data 12 Nov 2026 · updated 14:20 Cairo time" / "Recent (≤ 48 h)" / "Cached snapshot from …" / "Demo data". Never present cached data as live.
- **Graceful degradation:** a failing feed greys out only its chip and keeps the last snapshot; the sonification still plays, with an earcon plus a spoken "using cached data from …".
- **Deterministic sonification:** live data enters the engine only as an immutable snapshot with a `snapshotId` (hash). The ESL mapping is unchanged, so the same snapshot always gives the same score. Quiz clips use frozen historical pairs only, never live data.

### 11.2 Live feeds (verified 2026-11-13 from the box unless marked)

| Feed                                    | Upstream (exact)                                                                                                                                                                                                                                               | Key                            | Upstream freshness                            | Our revalidate                 | Rate limit                                             | Used for                                                                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------- | ------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GIBS daily imagery and data by date     | `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layer}/default/{YYYY-MM-DD}/{tms}/{z}/{y}/{x}.{ext}` (CORS `*` ✅). Latest dates seen in capabilities: MUR SST 2026-11-11, IMERG 2026-11-11, MODIS fires 2026-11-13, MODIS Terra true color 2026-11-12 ✅ | none                           | NRT, about 3 h to 2 days per layer            | dates: 3 h; decoded grids: 6 h | no published hard limit; we cache                      | "Today" overlays for SST, rain, fires, true color. The browser fetches imagery tiles directly; `/api/live/gibs-grid` decodes value PNGs (colormap) for sound |
| FIRMS fires, no key                     | `https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv` ✅ (4.8 MB); also `noaa-21-…` (not tested). **The S-NPP 24 h file was header-only at check time**, so prefer NOAA-20/21                                | none                           | NRT ≤ 3 h after overpass                      | 30 min                         | be polite: 1 fetch per window                          | Live wildfire layer: binned server-side to 1° cells + top 200 points (≤ 60 KB JSON)                                                                          |
| FIRMS Area API (regional, multi-day)    | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{FIRMS_MAP_KEY}/{SOURCE}/{W,S,E,N}/{1..5}/{date}`                                                                                                                                                           | **FIRMS_MAP_KEY**              | NRT                                           | 30 min                         | 5,000 transactions / 10 min (verified on the key page) | Regional queries (Egypt/Mediterranean) and the history the base MVP specced                                                                                  |
| Cairo air quality, modeled              | `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=30.04&longitude=31.24&current=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,us_aqi&hourly=…` ✅ (CORS `*`)                                                                                 | none                           | hourly (CAMS model, not station measurements) | 1 h                            | < 10,000/day, 5,000/h, 600/min (non-commercial)        | Live AQ chord for Cairo + any region center                                                                                                                  |
| Cairo air quality, measured             | `https://api.openaq.org/v3/locations?coordinates=30.04,31.24&radius=25000` → `/v3/locations/{id}/latest` (✅ reachable, returns 401 without a key)                                                                                                             | **OPENAQ_API_KEY** (X-API-Key) | per station, often hourly                     | 1 h                            | 60/min, 2,000/h (verified)                             | Station truth next to the model. **Whether Cairo has active stations is unverified** (needs the key)                                                         |
| Weather now / forecast                  | `https://api.open-meteo.com/v1/forecast?latitude=30.04&longitude=31.24&current=temperature_2m,wind_speed_10m,precipitation` ✅                                                                                                                                 | none                           | 15 min to hourly                              | 15 min                         | same Open-Meteo limits                                 | Spoken "now in Cairo"; optional weather voice                                                                                                                |
| CO₂ daily + monthly (Mauna Loa)         | `https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.csv` ✅, `https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv` ✅                                                                                                                         | none                           | daily (preliminary)                           | 24 h                           | —                                                      | co2 layer "latest" point                                                                                                                                     |
| Arctic sea ice daily                    | `https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v4.0.csv` (**returned HTTP 500 at check time**; directory root 200; retry)                                                                                                 | none                           | daily (1-day lag)                             | 24 h                           | —                                                      | sea_ice "latest"; falls back to snapshot                                                                                                                     |
| Global temperature                      | `https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv` ✅                                                                                                                                                                                           | none                           | monthly                                       | 7 d                            | —                                                      | temperature latest month                                                                                                                                     |
| Natural events                          | `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=7` ✅ (CORS `*`)                                                                                                                                                                                   | none                           | near real time                                | 1 h                            | —                                                      | Live event markers (storms, volcanoes, fires) as earcons on the globe                                                                                        |
| NASA POWER point climatology (optional) | `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M&community=RE&longitude=31.24&latitude=30.04&start=…&end=…&format=JSON` ✅                                                                                                                 | none                           | daily, a few days' lag                        | 24 h                           | —                                                      | Cairo daily temperature history voice                                                                                                                        |
| EPIC full-disk Earth (optional)         | `https://epic.gsfc.nasa.gov/api/natural` ✅                                                                                                                                                                                                                    | none                           | daily                                         | 6 h                            | —                                                      | "Earth today" image in the intro                                                                                                                             |
| MERRA-2 monthly (GIBS)                  | as §2.2 S7/S8/S15                                                                                                                                                                                                                                              | none                           | monthly, ~1–2 month lag                       | 7 d                            | —                                                      | Aerosol/temperature "latest month"                                                                                                                           |

### 11.3 Honest: historical-only (no live version)

SVS visualizations R2–R11 (fixed periods); ECCO2 2007–08 and Perpetual Ocean 2 2021–23; DYAMOND CO₂ Jan–Mar 2020; GEDI 2019-04→2023-03; ISS LIS lightning (mission data 2017–2023, GIBS daily through 2021-09) — lightning **has no live feed** in this plan; Black Marble 2012/2016; BMNG; ETOPO (static); AIRS CO₂ maps (to 2012-02); AMSR2 sea-ice concentration on GIBS (capabilities end 2025-09-01; live sea ice comes from the NSIDC daily CSV). Night lights stay the 2012/2016 **brightness index** (decided), not live.

## 12. Clean code: data-layer structure and testing

### 12.1 Folder layout (additive to BUILD_BRIEF §2; module rules unchanged: import only through `index.ts`)

```
src/modules/data/
├─ index.ts                     # public API: getRegistry, loadLayer, loadView, useFeed, describeFreshness
├─ registry.ts                  # THE single registry: layers + views + feeds, built from public/data/registry.json
├─ schemas/                     # zod only, pure
│  ├─ layer.ts  view.ts  frame.ts  grid.ts  source.ts
│  ├─ feed.ts                   # FeedEnvelope, FreshnessStatus
│  └─ index.ts                  # also exports JSON Schema → pipeline (scripts/export-json-schemas.ts)
├─ adapters/                    # one file per upstream, pure parse + thin fetch
│  ├─ types.ts                  # interface SourceAdapter<Raw, Out> { id; urls(params); fetchRaw(signal); parse(raw): Out; license }
│  ├─ gibs.ts  gibsColormap.ts  svs.ts  firms.ts  openMeteo.ts  openMeteoAq.ts
│  ├─ openaq.ts  noaaGml.ts  nsidc.ts  gistemp.ts  eonet.ts  power.ts  epic.ts
├─ cache/
│  ├─ memory.ts                 # LRU for decoded grids/textures (per view, size-bounded)
│  ├─ idb.ts                    # IndexedDB (idb-keyval) for snapshots and grids across reloads
│  └─ policy.ts                 # TTL per feed (mirrors revalidate), status computation
├─ loader.ts                    # client: live → asset-host snapshot → bundled snapshot → demo; returns FeedEnvelope
├─ freshness.ts                 # status + Cairo-time labels (EN/AR digits via core/format)
└─ workers/decode.worker.ts     # grid decode, region stats, colorized previews (OffscreenCanvas)
src/server/feeds/               # server-only: key handling, upstream fetch with timeout/retry/backoff
│  └─ {feed}.ts  env.ts         # reads FIRMS_MAP_KEY, OPENAQ_API_KEY…, validated by core/env.ts (zod)
src/app/api/live/[feed]/route.ts  # one dynamic route; dispatches through the registry; sets cache headers
scripts/snapshot.ts             # used by the GitHub Action and the Vercel cron; same adapters as the route
pipeline/earth_pipeline/sources/{gibs,svs,etopo,firms,...}.py   # offline builds (§5); same source ids as adapters
public/data/{registry.json, layers/, views/, snapshots/, grids/, assets.manifest.json}
```

Rules:

- An adapter never touches React, the store or Tone.
- `parse()` is pure and fixture-tested.
- Every output passes zod before leaving the adapter.
- Source ids are shared across TS adapters, Python sources, manifests and attribution, so the /data page is generated, not hand-written.
- No `any`. No hidden fallbacks: every fallback sets `status` and is shown in the UI.

### 12.2 Registry entry (single source of truth)

```jsonc
{
  "id": "ocean_sst",
  "config": "/data/layers/ocean_sst.config.json",
  "view": "/data/views/ocean_sst.view.json",
  "data": "/data/layers/ocean_sst.json",
  "live": {
    "feed": "gibs-grid",
    "params": { "layer": "GHRSST_L4_MUR_Sea_Surface_Temperature" },
    "revalidate": 21600,
  },
  "sources": ["gibs:GHRSST_L4_MUR_Sea_Surface_Temperature"],
  "historicalOnly": false,
}
```

### 12.3 Environment

`.env.example` gets names only: `FIRMS_MAP_KEY=`, `OPENAQ_API_KEY=`, `NASA_API_KEY=` (optional), `EARTHDATA_TOKEN=` (pipeline only, optional), `R2_ACCOUNT_ID=`, `R2_ACCESS_KEY_ID=`, `R2_SECRET_ACCESS_KEY=`, `R2_BUCKET=`, `NEXT_PUBLIC_ASSET_BASE_URL=`, `CRON_SECRET=`, `REVALIDATE_SECRET=`. GitHub Action secrets mirror these. No value is ever committed or logged.

### 12.4 Testing plan

| Layer       | Tool                                                                                                                                                                                          | What                                                                                                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schemas     | Vitest                                                                                                                                                                                        | every file in `public/data` validates; registry ids = `LayerId`; `sample` flag rule; views have credits                                                                                                                                |
| Adapters    | Vitest + **recorded real fixtures** (small, dated, source-labeled; never invented values)                                                                                                     | parse GIBS PNG + colormap (the box sample: 100% exact hit), FIRMS CSV, Open-Meteo/AQ JSON, OpenAQ JSON, GML CSV, NSIDC CSV, EONET JSON                                                                                                 |
| Fallbacks   | Vitest + MSW                                                                                                                                                                                  | timeout, 401, 429, 500, malformed body → correct `status` and snapshot used; keys never appear in errors                                                                                                                               |
| Determinism | Vitest                                                                                                                                                                                        | same snapshot → identical score hash; live-mode toggle doesn't change the mapping                                                                                                                                                      |
| Workers     | Vitest (worker in node)                                                                                                                                                                       | grid decode, region stats against the Python implementation on the same fixture (±1e-6)                                                                                                                                                |
| Pipeline    | pytest                                                                                                                                                                                        | decode, ETOPO resample, manifest hashes, budget check fails over budget                                                                                                                                                                |
| E2E         | Playwright                                                                                                                                                                                    | `?demo=1` with the network blocked plays every view; a live feed forced to fail shows "Cached snapshot"; view switching; keyboard-only flow; axe a11y                                                                                  |
| Perf        | Lighthouse CI (budgets §10.1 on `/en` and `/en/listen`), `size-limit`, Playwright `?perf=1` trace (rAF frame times, long tasks, `renderer.info.memory`, audio key→onset from Tone timestamps) | CI uses a software GPU, so frame-time asserts there are **smoke thresholds** (p95 ≤ 50 ms); the real tier budgets are checked by hand on 3 devices (phone, laptop, desktop) before the demo, with results in `docs/validation/perf.md` |
| Live canary | GitHub Action (daily, read-only GETs)                                                                                                                                                         | each upstream responds and parses; a failure fails the job (no issues or messages are created)                                                                                                                                         |

## 13. Complete resource list (every resource used)

Link check: 2026-11-13 from the box (✅ 200; ⏱ timeout or TLS issue from the box only, kept; ⚠ other). No resource was dropped as dead: every one resolved, timed out, or gave a server/auth error (kept, marked).

### 13.1 Official NASA

| Resource                                                                                                                                                                     | Exact URL                                                                                             | License / attribution                    | Used for                        | Key                                     | Check            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------- | --------------------------------------- | ---------------- |
| Space Apps challenge page                                                                                                                                                    | https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/                     | Space Apps terms                         | challenge brief                 | none                                    | ⏱ (TLS chain)    |
| SVS EIC gallery                                                                                                                                                              | https://svs.gsfc.nasa.gov/gallery/earth-information-center/                                           | NASA media guidelines, credit SVS        | index, links                    | none                                    | ✅ (WebFetch)    |
| SVS 13786 Caldwell 73                                                                                                                                                        | https://svs.gsfc.nasa.gov/13786/                                                                      | credit SYSTEM Sounds; NASA/ESA           | sonification reference          | none                                    | ✅               |
| SVS 5313 / 5475 night lights                                                                                                                                                 | https://svs.gsfc.nasa.gov/5313/ · https://svs.gsfc.nasa.gov/5475/                                     | credit §9                                | night lights                    | none                                    | ✅ API (⏱ curl)  |
| SVS 3912 ECCO2                                                                                                                                                               | https://svs.gsfc.nasa.gov/3912/                                                                       | credit §9                                | ocean currents/SST              | none                                    | ✅ API           |
| SVS 5425 / 5505 / 5479 Perpetual Ocean 2                                                                                                                                     | https://svs.gsfc.nasa.gov/5425/ · /5505/ · /5479/                                                     | credit §9                                | intro, ocean overlay            | none                                    | ✅ API           |
| SVS 5669 / 5572 / 5552 aerosols                                                                                                                                              | https://svs.gsfc.nasa.gov/5669/ · /5572/ · /5552/                                                     | credit GMAO/SVS                          | aerosols                        | none                                    | ✅ API           |
| SVS 5533 / 5518 / 5147–5154 air quality and daily maps                                                                                                                       | https://svs.gsfc.nasa.gov/5533/ · /5518/ · /5147/ … /5154/                                            | credit GMAO/SVS                          | air quality                     | none                                    | ✅ API           |
| SVS 5196 DYAMOND CO₂                                                                                                                                                         | https://svs.gsfc.nasa.gov/5196/                                                                       | credit §9                                | intro (optional)                | none                                    | ✅ API           |
| SVS 5011 ISS LIS lightning                                                                                                                                                   | https://svs.gsfc.nasa.gov/5011/                                                                       | credit §9                                | lightning                       | none                                    | ✅ API           |
| SVS 4960 atmospheric river                                                                                                                                                   | https://svs.gsfc.nasa.gov/4960/                                                                       | credit GMAO/SVS                          | intro (optional)                | none                                    | ✅               |
| SVS 4950 GEDI                                                                                                                                                                | https://svs.gsfc.nasa.gov/4950/                                                                       | credit §9                                | forest view                     | none                                    | ✅ API           |
| SVS 4993 Dixie Fire (optional)                                                                                                                                               | https://svs.gsfc.nasa.gov/4993/                                                                       | credit SVS                               | wildfire story                  | none                                    | ✅ (gallery)     |
| NASA GIBS (WMTS/WMS + colormaps)                                                                                                                                             | https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml                         | GIBS acknowledgement (§9)                | all textures, live daily layers | none                                    | ✅ CORS `*`      |
| GIBS docs                                                                                                                                                                    | https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api | —                                        | reference                       | none                                    | ✅               |
| Layers via GIBS: BMNG, Black Marble 2012/2016, MUR SST (JPL PO.DAAC), MERRA-2 (GMAO), LIS (GHRC), GEDI L3/L4B (ORNL DAAC), IMERG (GPM), AMSR2 (JAXA/NASA), MODIS/VIIRS fires | layer ids in §2.2                                                                                     | per-product credit (§9)                  | textures, frames, live          | none                                    | ✅               |
| NASA FIRMS                                                                                                                                                                   | https://firms.modaps.eosdis.nasa.gov/ · 24 h CSV (§11.2) · Area API                                   | FIRMS acknowledgement (BUILD_BRIEF §5.5) | wildfire, live                  | MAP_KEY for the API; none for 24 h CSVs | ✅               |
| NASA GISS GISTEMP v4                                                                                                                                                         | https://data.giss.nasa.gov/gistemp/                                                                   | GISTEMP Team citation                    | temperature                     | none                                    | ✅               |
| NASA EONET v3                                                                                                                                                                | https://eonet.gsfc.nasa.gov/api/v3/events                                                             | NASA, credit EONET                       | live events                     | none                                    | ✅               |
| NASA POWER (optional)                                                                                                                                                        | https://power.larc.nasa.gov/                                                                          | credit NASA LaRC POWER                   | Cairo point history             | none                                    | ✅               |
| NASA EPIC (optional)                                                                                                                                                         | https://epic.gsfc.nasa.gov/api/natural                                                                | credit NASA EPIC team / DSCOVR           | intro "Earth today"             | none                                    | ✅               |
| NASA CMR (pipeline discovery)                                                                                                                                                | https://cmr.earthdata.nasa.gov/search/                                                                | —                                        | find granules                   | none                                    | ✅               |
| NASA Worldview (reference only)                                                                                                                                              | https://worldview.earthdata.nasa.gov/                                                                 | —                                        | layer browsing                  | none                                    | ✅               |
| Earth.gov vital signs (UI links)                                                                                                                                             | https://earth.gov/                                                                                    | —                                        | links                           | none                                    | ✅               |
| NASA media guidelines                                                                                                                                                        | https://www.nasa.gov/nasa-brand-center/images-and-media/                                              | —                                        | usage rules                     | none                                    | ✅               |
| GEOS-CF datashare (optional raw)                                                                                                                                             | https://portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/                                               | GMAO                                     | pipeline only                   | none                                    | ⏱                |
| GHRC ISS LIS raw (optional)                                                                                                                                                  | https://ghrcdrive.nsstc.nasa.gov/pub/lis/iss/data/science/final/nc/                                   | Blakeslee 2020                           | pipeline only                   | maybe Earthdata                         | ⏱                |
| Visible Earth originals (optional)                                                                                                                                           | https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/ (and 73934, 73963, 144898, 57747)     | NASA EO / Reto Stöckli                   | 8K+ masters                     | none                                    | ⏱ (TLS from box) |

### 13.2 Other agencies and open sources (filling gaps)

| Resource                                    | Exact URL                                                                                                                     | License / attribution                                                                | Used for                                              | Key      | Check                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------- | -------- | ----------------------------------------- |
| NOAA NCEI ETOPO 2022                        | https://www.ncei.noaa.gov/products/etopo-global-relief-model                                                                  | US Gov public domain; cite NOAA NCEI 2022                                            | height, bathymetry, normals, water mask               | none     | ✅                                        |
| NOAA GML Mauna Loa CO₂                      | https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv · https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_daily_mlo.csv | NOAA GML (Lan, Tans, Thoning)                                                        | co2 + live                                            | none     | ✅ CORS `*`                               |
| NSIDC Sea Ice Index v4 (NOAA/NSIDC G02135)  | https://noaadata.apps.nsidc.org/NOAA/G02135/ (daily and monthly CSVs) · https://nsidc.org/data/g02135/versions/4              | cite Fetterer et al., NSIDC                                                          | sea_ice + live                                        | none     | ✅ root and page; ⚠ CSV 500 at check time |
| Open-Meteo Forecast API                     | https://api.open-meteo.com/v1/forecast                                                                                        | **CC BY 4.0**, "Weather data by Open-Meteo.com"; free non-commercial < 10k/day       | live weather                                          | none     | ✅                                        |
| Open-Meteo Air Quality API (CAMS)           | https://air-quality-api.open-meteo.com/v1/air-quality                                                                         | CC BY 4.0 + "Contains modified Copernicus Atmosphere Monitoring Service information" | live Cairo AQ                                         | none     | ✅ CORS `*`                               |
| Open-Meteo terms                            | https://open-meteo.com/en/terms                                                                                               | —                                                                                    | limits                                                | —        | ✅                                        |
| OpenAQ v3                                   | https://api.openaq.org/v3/ · https://docs.openaq.org/                                                                         | OpenAQ terms; attribute OpenAQ + each original data provider (per-source licenses)   | measured AQ                                           | **key**  | ✅ (401 without key)                      |
| Natural Earth (borders, coastlines, labels) | https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip (and 50m) · https://www.naturalearthdata.com/   | public domain; credit "Made with Natural Earth"                                      | region outlines, labels                               | none     | ✅ CDN (⚠ site 406 to bots)               |
| GEBCO (optional alternative bathymetry)     | https://www.gebco.net/data-products/gridded-bathymetry-data                                                                   | GEBCO terms, attribution required                                                    | only if ETOPO ocean detail is lacking                 | none     | ✅                                        |
| NOAA SWPC (optional, not planned)           | https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json                                                           | public domain                                                                        | aurora easter egg                                     | none     | ✅                                        |
| Copernicus CDS / ADS (not used)             | https://cds.climate.copernicus.eu/ · https://ads.atmosphere.copernicus.eu/                                                    | Copernicus licence                                                                   | only if raw ERA5/CAMS is needed; Open-Meteo covers it | account  | ✅                                        |
| NOAA NCEI CDO (not used)                    | https://www.ncei.noaa.gov/cdo-web/token                                                                                       | —                                                                                    | only for station climate data                         | token    | ✅                                        |
| Hosting/CDN                                 | https://vercel.com/ · https://developers.cloudflare.com/r2/pricing/ · https://cdn.jsdelivr.net/ · GitHub Releases             | provider terms                                                                       | app, assets, CI                                       | accounts | ✅                                        |

## 14. Big datasets: the real solution (and how much to worry)

**Short answer: no need to worry, as long as these rules hold.** The raw sources are huge (ETOPO GeoTIFFs in the hundreds of MB, SVS ProRes 4 GB, EIC movies 0.4–4.5 GB, GEOS-CF NetCDF archives far larger), but the browser never needs them. Everything it loads is a small derivative, and the whole derived set is estimated at **under 0.5 GB** (4K set ≈ 50 MB, 8K set ≈ 180 MB, all frame/grid series ≈ 60 MB, videos ≤ 25 MB, snapshots < 5 MB).

Rules:

1. **Stream, don't download:** imagery for any date and zoom comes from **GIBS WMTS tiles on demand** (CORS `*`, verified), at the zoom the camera needs. Close-ups use regional WMS bbox patches.
2. **Precompute in the Python pipeline:** value grids (Uint8 bins + colormap, 720×360 / 1024×512 / 2048×1024), KTX2/WebP textures with mips, regional PNG tiles for detail patches, and a **COG** of the ETOPO derivative (kept in the pipeline for re-sampling). Zarr isn't needed at this scale.
3. **The browser never fetches NetCDF/HDF/GeoTIFF/ProRes:** a unit test scans the client bundle and the registry for `.nc|.nc4|.h5|.hdf|.he5|.tif|.mov` and fails; CSP `connect-src` allowlists only our origin, GIBS, Open-Meteo and the asset host.
4. **Where the big derived files live (decided: GitHub Release assets), and a verified catch:** release downloads redirect to `release-assets.githubusercontent.com` with **no `Access-Control-Allow-Origin` header** (checked 2026-11-13). The browser therefore can't load them directly as WebGL textures or via `fetch`. **jsDelivr does not serve release assets** (only repo files, ≤ 20 MB per file; open issue jsdelivr#18203).

**Recommendation (one approach):** keep the **GitHub Release `data-v1` as the archive of record** (decided). A GitHub Action **mirrors it to a Cloudflare R2 public bucket** with a CORS rule for our origins and `Cache-Control: public, max-age=31536000, immutable`, and the browser loads from R2 through `NEXT_PUBLIC_ASSET_BASE_URL`.

- **R2 free tier (verified on Cloudflare's pricing page, updated 2026-10-30):** 10 GB-month Standard storage, 1 M Class A (write/list) and 10 M Class B (read) operations per month, **egress free**. We'd use about 0.5 GB and well under 1 M reads in a hackathon.
- Use a custom domain if one is available. The `r2.dev` public URL is fine for the hackathon but Cloudflare positions it for development (rate-limited; verify before the final demo).

**Fallback if Hassan doesn't want a Cloudflare account:** commit the derived assets (each ≤ 20 MB) to an orphan `assets` branch, tag it `data-v1`, and serve via `https://cdn.jsdelivr.net/gh/HassenTMLCSSJS/earth-listens@data-v1/<path>` (no account; CORS `*` verified on jsDelivr). Last resort: a Vercel route proxy that streams release assets with CORS headers (costs Vercel bandwidth and adds latency).

## 15. Credentials (sites that need a key or account)

All keys are server-side only; none is ever exposed through a `NEXT_PUBLIC_` variable. Values go in `.env.local` / Vercel env / GitHub Actions secrets. **Never in docs or commits.** Signup links checked 2026-11-13.

| Service              | Signup link                                                                                     | Unlocks                                                                   | Free limits                                                                       | Env var                                                                                                | Required?                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| NASA FIRMS MAP_KEY   | https://firms.modaps.eosdis.nasa.gov/api/map_key/ ✅                                            | Area API: regional, multi-day fire detections (base-MVP wildfire history) | 5,000 transactions / 10 min (verified)                                            | `FIRMS_MAP_KEY`                                                                                        | **Required for regional/history wildfire**; live global 24 h works without it |
| NASA Earthdata Login | https://urs.earthdata.nasa.gov/users/new ✅                                                     | Raw granules from DAACs (PO.DAAC, LAADS, ORNL, GHRC) for the pipeline     | free                                                                              | `EARTHDATA_TOKEN` (pipeline only)                                                                      | Optional: not needed after the decisions (GIBS covers everything)             |
| api.nasa.gov         | https://api.nasa.gov/ ✅                                                                        | APOD and other api.nasa.gov gateway APIs                                  | DEMO_KEY 30/h and 50/day per IP; own key 1,000/h (verified)                       | `NASA_API_KEY`                                                                                         | Optional: nothing core uses it (EONET and epic.gsfc.nasa.gov need no key)     |
| OpenAQ v3            | https://explore.openaq.org/register ✅ (docs: https://docs.openaq.org/using-the-api/api-key ✅) | Measured station air quality (Cairo if stations exist)                    | 60/min, 2,000/h (verified)                                                        | `OPENAQ_API_KEY`                                                                                       | Optional, recommended (model AQ from Open-Meteo needs no key)                 |
| Copernicus CDS / ADS | https://cds.climate.copernicus.eu/ ✅ · https://ads.atmosphere.copernicus.eu/ ✅                | Raw ERA5 / CAMS                                                           | free with account                                                                 | `CDS_API_KEY`                                                                                          | **Not used** (Open-Meteo serves CAMS without a key)                           |
| NOAA NCEI CDO token  | https://www.ncei.noaa.gov/cdo-web/token ✅                                                      | Station climate records                                                   | 5 req/s, 10,000/day (verified)                                                    | `NOAA_CDO_TOKEN`                                                                                       | **Not used**                                                                  |
| Vercel               | https://vercel.com/signup ✅                                                                    | Hosting, route handlers, ISR cache, cron                                  | Hobby: cron at most once per day (verified); other Hobby quotas not verified here | `VERCEL_TOKEN` (only if deploying from CI), `CRON_SECRET`, `REVALIDATE_SECRET`                         | **Required** to deploy (deploys need Hassan's approval)                       |
| Cloudflare (R2)      | https://dash.cloudflare.com/sign-up ✅                                                          | Public asset bucket with CORS and free egress (§14)                       | 10 GB-month, 1 M Class A, 10 M Class B / month, free egress (verified)            | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `NEXT_PUBLIC_ASSET_BASE_URL` | **Recommended** (else the jsDelivr fallback)                                  |
| GitHub               | https://github.com/signup (returns 403 to bots; existing account)                               | Repo, Releases (archive of record), Actions (snapshots, CI), secrets      | public repo: free Actions minutes                                                 | `GITHUB_TOKEN` (built into Actions)                                                                    | **Required** (already in place)                                               |

**No key needed:** NASA GIBS (WMTS/WMS/colormaps), NASA SVS, FIRMS global 24 h CSVs, GISTEMP, EONET, NASA POWER, EPIC (epic.gsfc.nasa.gov), CMR, Open-Meteo forecast and air quality, NOAA GML, NSIDC, NOAA ETOPO, Natural Earth, jsDelivr.

## 16. Build order v2 (after approval; branch `feat/data-integration` from `develop`) and cut line

> **v4 status:** rows 1–12 shipped in PR #3 (merged 13 Nov 13:57 Cairo). The aerosol, lightning and air-quality views exist, but their sequences are still SAMPLE. Real frames move to PRD A4 (GEOS-CF) and A5 (GIBS). Rows 13–17 and "opt" were not built; they are now PRD Phases B and C. Row 15 (intro) is replaced by Zain's 8-scene intro (PRD D4). The table below is the v3 plan, kept for reference.

| #   | Task                                                                                                                                                                                            | Output                                    | Est.    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------- |
| 1   | Contracts + single registry + `FeedEnvelope`; adapter interface; env schema                                                                                                                     | `modules/data/{schemas,registry}` + tests | 2 h     |
| 2   | Pipeline `gibs.py`/`svs.py` + exact colormap decode; budget checker                                                                                                                             | pipeline + pytest (box sample fixtures)   | 2 h     |
| 3   | Base textures 2K (repo) / 4K default / 8K strong-desktop KTX2 + ETOPO height/normal/mask; `assets.manifest.json`; release `data-v1` staged + R2 mirror Action (or jsDelivr fallback)            | assets + manifest                         | 2.5 h   |
| 4   | Extend the shader globe: real textures, overlay + ramp, DataArrayTexture crossfade, split, data-driven note pulses; device tier + PerformanceMonitor + Settings override                        | globe v2                                  | 3 h     |
| 5   | Perf scaffolding: per-view lazy chunks, decode worker, Serwist SW, cache headers, size-limit + Lighthouse CI + Playwright `?perf=1`                                                             | CI gates                                  | 2 h     |
| 6   | **night_lights** (brightness index, labeled) + before/after + quiz pairs + credits                                                                                                              | layer                                     | 2 h     |
| 7   | **ocean_sst** (MUR, live daily via GIBS) + **ocean_currents** (video texture)                                                                                                                   | 2 views                                   | 3 h     |
| 8   | **Live core:** `/api/live/[feed]`, snapshot Action (3 h) + Vercel daily cron, freshness chips, fallbacks. Feeds: GIBS dates/grids, FIRMS 24 h, Open-Meteo weather + AQ, GML CO₂, GISTEMP, NSIDC | live mode                                 | 3 h     |
| 9   | **aerosols** (MERRA-2 AOD + species timbres)                                                                                                                                                    | layer                                     | 2 h     |
| 10  | **lightning** (climatology + 18 seasonal frames; historical only)                                                                                                                               | layer                                     | 1.5 h   |
| 11  | **air_quality** (GEOS-CF historical + live Cairo via Open-Meteo AQ)                                                                                                                             | layer                                     | 2 h     |
| 12  | Device performance pass on phone/laptop/desktop against §10.1; fix regressions; `docs/validation/perf.md`                                                                                       | report                                    | 1.5 h   |
| —   | **CUT LINE**: everything above ships. Below degrades gracefully (sample frames stay labeled SAMPLE; missing feeds show "not live")                                                              |                                           |         |
| 13  | Real frames for temperature (MERRA-2) and sea ice (AMSR2 to 2025-09)                                                                                                                            | frames                                    | 1.5 h   |
| 14  | **forest_height** (GEDI + canopy displacement)                                                                                                                                                  | layer                                     | 1.5 h   |
| 15  | Intro: SVS media into the existing 6 chapters (+ EPIC "Earth today")                                                                                                                            | intro                                     | 1.5 h   |
| 16  | EONET live event markers, OpenAQ stations (if key), FIRMS Area API (if key)                                                                                                                     | live extras                               | 1.5 h   |
| 17  | `/data` page generated from registry + manifests                                                                                                                                                | page                                      | 1 h     |
| opt | precipitation (IMERG), AIRS CO₂, dust PM2.5, POWER, raw NetCDF                                                                                                                                  | —                                         | if time |

Credits ship with each layer (every view requires `credit`), so attribution is never cut.

## 17. Decisions and open questions (status as of 2026-11-13 12:07 Cairo time)

> **v4 status of the open items:**
>
> 1. Done: the plan was approved, and `feat/data-integration` was built and merged (PR #3).
> 2. Done: R2 was chosen. Bucket `earth-listens-assets` is live at the r2.dev URL. Still to do: release `data-v1`, the upload, an R2 access key, and optionally a custom domain (PRD A6).
> 3. Done: `FIRMS_MAP_KEY` was obtained. `OPENAQ_API_KEY` is still optional (PRD C5).
> 4. Open: the Vercel plan and the preview have not been checked (PRD A7). The 3-hourly snapshot runs on GitHub Actions.
> 5. Open: nobody has confirmed the official resources tab in a browser yet (PRD E2).
> 6. Open: the camera preset priority (PRD E5 demo script).

**Decided (keep):**

- Big 4K/8K textures and frames: **GitHub Release assets** as the archive of record. Serving needs a CORS-capable mirror (§14).
- **4K by default, 8K on strong desktops** (auto-detected; Settings override).
- Night lights: GIBS **brightness index**, labeled everywhere as image-derived, not calibrated radiance.
- Lightning: **seasonal set** (18 frames, 10-day windows); historical only.
- Sonification stays **deterministic** (same snapshot → same score).

**Open:**

1. Approve this plan and creating `feat/data-integration` from `develop`. No branch or commit until then.
2. **Asset serving:** create a Cloudflare account for the R2 mirror (recommended), or use the no-account jsDelivr orphan-branch fallback? (GitHub release URLs alone can't feed WebGL: no CORS, verified.)
3. Keys: who signs up for **FIRMS_MAP_KEY** (needed for regional wildfire history) and optionally **OPENAQ_API_KEY**? Values go into Vercel/GitHub secrets only.
4. Vercel plan: Hobby (crons at most daily, so the 3-hourly refresh runs on GitHub Actions) or the team's Pro? Deploys still need Hassan's approval.
5. Someone confirms the official resources tab in a normal browser (the site failed TLS from the build box).
6. Camera preset priority for the pitch (Cairo/Nile assumed first).

## CI fix (prerequisite, Nov 13 2026)

> **v4 status: merged into `develop`** through PR #3 (commits `56f2854` and `8bc8c3d` on `feat/data-integration`; no separate fix branch). PR #3 ran on top of it with all 4 checks green, Vitest 82 and Playwright 25/25, so the 71/23 counts below are the older local run. `main` (`7950683`) does not have the fix yet; PRD A8 merges `develop` → `main`. D0 (Theatre.js + svg.js) must add any build-script deps to `allowBuilds`.

The data branch (`feat/data-integration`) must be cut from a `develop` that already contains branch `fix/ci-pnpm-builds`. Until that lands, every CI run fails at `pnpm install` and the e2e and Lighthouse jobs never run.

- Root cause: pnpm 12.18.0 (pinned in `package.json` `packageManager`) fails the install when a dependency's build script has been neither allowed nor denied. `onnxruntime-node` (pulled in by `kokoro-js`) and `protobufjs` were unlisted, so the `web` job failed with `ERR_PNPM_IGNORED_BUILDS`. `e2e` and `lighthouse` have `needs: web`, so GitHub skipped them.
- Fix: `pnpm-workspace.yaml` `allowBuilds` now sets `onnxruntime-node: false` and `protobufjs: false`. Voices run in the browser through onnxruntime-web, so neither script is needed. The lockfile is unchanged. The actions are bumped to their Node 24 versions.
- Also fixed: the README and `docs/ARCHITECTURE.md` Mermaid labels are now quoted. Both diagrams were checked with @mermaid-js/mermaid-cli 11.
- Local results: install, typecheck, lint, format check, data validation, Vitest (71/71), `next build`, Playwright (23/23) and Lighthouse CI all pass.
- Any new dependency that has an install script must be added to `allowBuilds` as `true` or `false`, or CI fails again.
