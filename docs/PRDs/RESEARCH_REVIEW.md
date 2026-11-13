# Earth Listens — Research intake review

**Prepared:** 13 November 2026 (Africa/Cairo)  
**Inputs:** Nesma and Basmala research zips, unpacked under this folder as `Earth_Listens_Team_Package/` and `Earth_Listens_Research/`.  
**Compared against:** repo `origin/develop` at `d3e5634` (`/workspace/earth-listens-repo`), plus `DATA_INTEGRATION_ADDENDUM.md`, `BUILD_BRIEF.md`, `public/data/sources.json`, `ATTRIBUTION.md`, and `docs/RESEARCH.md`.

This is a source-and-gap review. It does not change the repo, invent measurements, or replace the Earth Sonification Language in `docs/SONIFICATION.md`.

## 1. What arrived

### Pack A — `Earth_Listens_Team_Package/` (lightweight share)

A complete research report, a five-record NASA GEOS-CF V1 carbon monoxide sample (CSV/JSON), official credit lines, a 32-link reachability log dated 13 November 2026, 17 compressed stills, and download URLs for six videos (the videos themselves are omitted from this zip). Focus: GEOS-CF CO, SVS 5533, SVS 5153, and SVS 14439.

### Pack B — `Earth_Listens_Research/` (catalog only)

A catalog of 78 official SVS media rows and six model/dataset entries. **No media and no original dataset files are included.** The pack itself says this clearly in `STATUS.md`. Coverage: SVS 5196, 5533, 5572, 5669, 5425, 3912, and 4960, plus a note that NSIDC sea ice was not obtained. File lists for 5196, 5533, and 5572 were read from the official SVS API. File lists for 5669, 5425, 3912, and 4960 were taken from API excerpts and marked for re-check.

## 2. How this review was checked

- Official SVS item APIs (`https://svs.gsfc.nasa.gov/api/<id>`) were fetched on 13 November 2026 for 14439, 5153, 4960, 5113, 5425, and 5552. Those pages are live.
- The exact GEOS-CF OPeNDAP query in the research pack returned the same five `co` values as `validated_co_sample.json` (7.230399E-8 through 7.315437E-8 mol mol⁻¹ at 49°N, 120°W, model layer 72).
- GMAO product page `https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/` returned HTTP 200.
- GMAO documentation PDFs are live: Knowland et al., *File Specification for GEOS-CF Products*, GMAO Office Note No. 17 (Version 1.3), 12 December 2022 (847,252 bytes); Lucchesi, *File Specification for GEOS FP*, GMAO Office Note No. 4 (Version 1.2), 11 July 2018 (662,667 bytes).
- DOI `10.5281/zenodo.16782523` (cited for SVS 5572) resolves to `https://zenodo.org/records/16782523` (HTTP 200).
- Direct downloads from `svs.gsfc.nasa.gov` timed out from this box (DNS here resolves that host to `198.18.0.1`). The GEOS-CF datashare (`portal.nccs.nasa.gov`) and GEOS-FP portal (`fluid.nccs.nasa.gov`) also timed out, matching the addendum. Those media-file byte sizes therefore rely on the official API or the team's 13 November 2026 link check (32/32 HTTP 200), and are marked where we could not re-download the file ourselves.
- This review did not re-run Cairo, PM2.5, ozone, or NOx OPeNDAP queries. Those remain unverified.

## 3. How this maps to our gaps

| Current gap | Does this research fill it? |
|---|---|
| Aerosol, lightning, and air-quality **histories still SAMPLE** | **Partly, air quality only.** The packs give a proven, no-key OPeNDAP path for GEOS-CF `co`, plus compact pollutant visuals. They do **not** replace the SAMPLE yearly regional series, and they do not deliver MERRA-2 AOD or LIS lightning numbers. Those still come from GIBS, as already planned. |
| MERRA-2 temperature frames, AMSR2 sea ice, GEDI forest height, precipitation, AIRS CO₂ | **No new numerical datasets.** MERRA-2 appears only as the model behind SVS 4960. NSIDC is marked missing in Pack B, but the repo already snapshots it. |
| SVS intro clips | **Yes — this is the strongest contribution.** Compact, officially credited stills and small movies, with exact URLs. |
| EONET markers, OpenAQ stations, FIRMS regional history | **No.** Not in either pack. |
| Narration MP3s and the citations/sources page | **Partly.** SVS 4960 has official English `.vtt`/`.srt` captions (6.3 KB). The packs do not include our site narration MP3s. They do provide complete official credit lines and GMAO file-spec documents that belong on `/data` and in `ATTRIBUTION.md`. |
| Listen/Tutorial performance (0.80/0.81) and a ~2.1 MB gzip JS bundle | **Indirectly.** The packs point to compact stills and sub-8 MB videos we can lazy-load. They also list many 100–500 MB movies that must **not** be shipped to the browser. |

## 4. Source table

Recommendation key: **adopt now** = use in the next implementation pass; **adopt later** = useful after the demo cut line, or needs a re-encode / extra query first; **skip** = too large, duplicate, conflicting, or not useful for this site.

| Source | What it gives | Gap it fills | Access | Credentials | Size and format | License | Live vs snapshot | Recommendation |
|---|---|---|---|---|---|---|---|---|
| NASA NCCS GEOS-CF V1 OPeNDAP `chm_tavg_1hr_g1440x721_v1` variable `co` | Hourly-average modeled CO; validated 5-hour sample for 1 July 2024, 49.0°N, 120.0°W, model layer 72, unit mol mol⁻¹, missing sentinel `1e15` | Access method for replacing SAMPLE air-quality *numbers* (not the 5-row sample itself) | `https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/chm_tavg_1hr_g1440x721_v1.ascii?...` — no auth; browser CORS is expected to fail, so fetch server-side | None | Tiny ASCII for a few cells; full fields are large. Product docs: Knowland1446.pdf | NASA GMAO; credit GMAO; not endorsed by NASA | Historical model output (not a live forecast). Snapshot the query result | **Adopt now** (method + test fixture). Do not drop the 5-row North American sample into `air_quality.sample.json` |
| NASA GMAO GEOS-CF product page and Knowland file spec | Official product description, units, file layout | Citations, correct handling of sentinels and layers | `https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/` and `https://gmao.gsfc.nasa.gov/pubs/docs/Knowland1446.pdf` (verified HTTP 200) | None | PDF 847 KB | NASA GMAO | Documentation | **Adopt now** — cite on `/data` and in `ATTRIBUTION.md` |
| Lucchesi GEOS-FP file spec | Official layout for GEOS-FP, the model behind SVS 5572/5669/5552 | Citations for aerosol visuals | `https://gmao.gsfc.nasa.gov/pubs/docs/Lucchesi1203.pdf` (verified HTTP 200) | None | PDF 663 KB | NASA GMAO | Documentation | **Adopt now** — cite with aerosol credits |
| SVS 14439 Air Pollution Model Runs | Compact GEOS-CF animations for CO, and also ozone, PM2.5, and nitrogen oxides (the pack only listed CO) | Intro / air-quality visual context; four-voice chord story | `https://svs.gsfc.nasa.gov/14439/` (API live). Direct files under `/vis/a010000/a014400/a014439/` | None | Team-listed: `CO.webm` 3.5 MB, `CO.mp4` 7.4 MB, `CO.00040_print.jpg` ~173 KB, all 2048×1024 except the still (1024×512). `PM2.5.webm`, `Ozone.mp4`, and `NO.mp4` exist on the official API; their byte sizes are **unverified** here. Skip `CO.mov` (247 MB) and `CO_GIF.gif` (55.5 MB) | NASA media guidelines; credit NASA's Goddard Space Flight Center; producer Katie Jepson; visualizer Joseph V. Ardizzone; technical support Aaron E. Lepsch | Historical model run (produced 2023). Snapshot / host the compact files | **Adopt now** — compact CO (and PM2.5 if ≤ ~8 MB) clips and print stills. Add this id to `sources.json` (it is missing today) |
| SVS 5153 Carbon Monoxide, plus siblings 5151 PM2.5, 5152 O₃, 5154 NOₓ | Near-surface GEOS-CF stills, color bars, and a 2048×1024 CO movie. Pages are in the “Updates Regularly” series | Air-quality explanation stills and legends; optional daily context frames | `https://svs.gsfc.nasa.gov/5153/` (API live). CO print and colorbar URLs as in the pack | None | Team-listed: print still 180.4 KB; `MC03_stage4_GMAO_CO_2048x1024_en.mp4` 17.7 MB; color bars 4–8 KB. 5151/5152/5154 print stills confirmed on the 14439/5153 API | NASA media guidelines; credit NASA’s Global Modeling and Assimilation Office; visualizer Joseph V. Ardizzone | Visualizations that NASA updates regularly — treat each downloaded file as a dated snapshot, not a live tile | **Adopt now** — print stills and color bars. **Adopt later** — 17.7 MB CO mp4 if a WebM ≤ 8 MB is not enough; daily 5151–5154 frames after the cut line |
| SVS 5533 Air Quality Model Runs (already in `sources.json` and the addendum as R6) | Labeled sphere/map stills and long movies of modeled CO, PM2.5, O₃, NOₓ for July–August 2024 | Intro chapter / contextual hero. Not synchronized with the 5-row OPeNDAP sample | `https://svs.gsfc.nasa.gov/5533/` | None | Official 1920×1080 labeled still ~2.2 MB (team WebP 341 KB). 5760×3240 movies 286–361 MB; 32:9 EIC movies 179 MB and 537 MB | NASA SVS and NASA GMAO; visualizers Helen-Nicole Kostis (USRA), Joseph V. Ardizzone; science Lesley Ott | Historical model period. Snapshot stills | **Adopt now** — 1920×1080 labeled and sphere stills only. **Skip** the multi-hundred-MB movies in the browser |
| SVS 5196 DYAMOND Global CO₂ (already planned, optional intro) | Globe-orbit animation of modeled CO₂, Jan–Mar 2020, plus color bar | Intro “breathing Earth” clip. Numbers stay on NOAA Mauna Loa / planned AIRS maps | `https://svs.gsfc.nasa.gov/5196/` | None | 1080p H.265 mp4 **6.9 MB** (confirmed in the official page/API listing). 2160p 68.4 MB | NASA GMAO GEOS DYAMOND; AJ Christensen et al. (SVS); Lesley Ott | Fixed 2020 model period. Snapshot | **Adopt now** — the 6.9 MB 1080p orbit clip and the color bar. Skip 2160p unless re-encoded |
| SVS 4960 Atmospheric river (already planned, optional intro) | Narrated MERRA-2 3D moisture-transport story, official English captions, non-narrated cut, color bars | Intro / precipitation story; caption text we can reuse. Not IMERG rainfall numbers | `https://svs.gsfc.nasa.gov/4960/` (API live; this re-check fills Pack B’s “excerpt” flag) | None | Captions 6.3 KB `.vtt`/`.srt` (official). Narrated HD WebM **68.6 MB**; HD mp4 410.9 MB; 4K mp4 646.9 MB. Pack B missed the official HD WebM and the non-narrated `atmos_river_HD.webm` | NASA GMAO MERRA-2; NASA SVS (Kel Elkins, Greg Shirah; scientists Allison Collow, Natalie Thomas, Michael Bosilovich; producers Jefferson Beck, LK Ward) | One historical event. Snapshot a short re-encode | **Adopt now** — captions and a still. **Adopt later** — a ≤ 8 MB WebM excerpt of the HD WebM (the raw 68.6 MB file is too large for the site budget) |
| SVS 5572 GEOS Aerosols (in the addendum as R5a; **missing from `sources.json`**) | 45-day species visualization (sea salt, dust, smoke, sulfate), event stills, color bar; DOI 10.5281/zenodo.16782523 | Aerosol intro / species legend. Not MERRA-2 AOD history | `https://svs.gsfc.nasa.gov/5572/` | None | Compact stills 1.5–4.2 MB (1920×1080 and 2048×1024); color bar 0.04 MB. Movies 86–526 MB | NASA GMAO and NASA SVS; Joseph V. Ardizzone, Helen-Nicole Kostis; Lesley Ott. Cite the Zenodo DOI | 1 Aug–14 Sep 2024 GEOS-FP period. Snapshot stills | **Adopt now** — 1920 stills + color bar + DOI in credits. **Skip** the large movies unless re-encoded later |
| SVS 5669 GEOS Aerosols 2025 (already in `sources.json`) | Single timestamp still, 19 Aug 2025 20:00 UTC, several resolutions | Aerosol still for the intro (addendum chapter 3) | `https://svs.gsfc.nasa.gov/5669/` — Pack B list was an excerpt; prefer the official page when downloading | None | 1920×1080 through 7680×4320 PNG; use 1920 or 3840 only | Same GMAO/SVS credit line as 5572 | One timestamp. Snapshot | **Adopt now** — 1920×1080 still (already the addendum pick). Skip 8K on the page |
| SVS 5552 Science On a Sphere: Aerosols (addendum S19; **missing from `sources.json`**) | Equirectangular species movie and 1024×512 / 2048×1024 stills, plus a transparent color bar — suitable for a globe | Aerosol species texture on the globe | `https://svs.gsfc.nasa.gov/5552/` (API live). Pack B listed this as related, not collected | None | `SOS_Aerosols_1024x512.png` is the right first file. Equirect movies at 2048×1024 and 4096×2048 — sizes **unverified** here; do not ship the 4096 movie without a budget check | Same GMAO/SVS credit line; GEOS-FP 1 Aug–15 Sep 2024 (Lucchesi spec) | Historical model period. Snapshot a still or a short re-encode | **Adopt now** — 1024×512 (or 2048×1024) still + color bar. **Adopt later** — equirect movie if it fits the ≤ 25 MB / ≤ 8 MB re-encode budget |
| SVS 5425 Perpetual Ocean 2 (already planned for intro chapter 2) | Beauty-shot tour of western boundary currents (ECCO-2, 2021–2023). Official page also has temperature, salinity, and a **sea-ice-only overlay** that Pack B did not catalog | Intro ocean clip. The sea-ice overlay is a model visual, not the NSIDC index | `https://svs.gsfc.nasa.gov/5425/` (API live; this re-check fills Pack B’s “excerpt” flag). 1080p beauty: `perpetual_ocean2_CLOSE_093_clean_noDate_1080p30.mp4` | None | 1080p mp4 size **unverified** here; addendum already requires a ≤ 8 MB WebM excerpt. Do **not** use related produced video SVS 14745 in the site (Universal Music Production cues are noted on that page) | NASA SVS; Greg Shirah, Horace Mitchell; scientists Atousa Saberi, Josh Willis | Fixed 2021–2023 model period. Snapshot a short silent excerpt | **Adopt now** — silent 1080p beauty excerpt, as already planned. **Adopt later** — sea-ice overlay as an intro still only. **Skip** 14745 |
| SVS 3912 ECCO2 currents and SST (already in `sources.json`) | Flat equirect current/SST still; long frame set | Ocean-current globe frames (already planned) | `https://svs.gsfc.nasa.gov/3912/` — Pack B list is incomplete (excerpt) | None | One ~2048×1024 still, plus a large frame directory. Sizes unverified | NASA/GSFC SVS; ECCO2 | Historical model (confirm dates on the page; addendum says 2007–08) | **Adopt later** — one still is fine; do not bulk-download the frame set |
| SVS 5518 Science On a Sphere: Air Quality Model Runs | Equirect / SOS companion to 5533 | Optional globe-wrapped air-quality visual | `https://svs.gsfc.nasa.gov/5518/` (linked from official related lists; item page not re-fetched in full) | None | Unverified in this pass | NASA SVS / GMAO, same family as 5533 | Historical model period | **Adopt later** |
| SVS 5113 VIIRS active fires, 2024–present | Daily-updating five-day FRP window; equirect 4096×2048 movie and a “latest” PNG. Already named in `ATTRIBUTION.md` and `docs/RESEARCH.md`, but **not** in `sources.json`. Pack B mentioned 5110, not 5113 | Wildfire intro / globe context. Does not replace FIRMS points or regional history | `https://svs.gsfc.nasa.gov/5113/` (API live) | None | `fires_frp_VIIRS_2048p30.mp4` listed at 46.5 MB; too big as-is. `VIIRS_fires_latest.png` is 4096×2048 | NASA media guidelines; visualizer Trent L. Schindler; scientist Doug C. Morton; VIIRS Suomi NPP and NOAA-21 | NASA says the visualization is updated daily — snapshot a dated still | **Adopt later** — one latest still or a re-encoded clip, then add the source to `sources.json`. Useful, but not required to close the SAMPLE-history gaps |
| GEOS-CF datashare NetCDF `portal.nccs.nasa.gov/datashare/gmao/geos-cf/v2/` | Raw model archives | Pipeline-only alternative to OPeNDAP | Direct HTTP, no key in the addendum; **timed out** from this box again | None stated | Very large NetCDF | NASA GMAO | Historical archives | **Adopt later** — keep OPeNDAP as the first path |
| GEOS-FP portal `fluid.nccs.nasa.gov/weather/` | GEOS-FP analyses/forecasts behind the aerosol visuals | Pipeline only | Timed out from this box | None stated | Large | NASA GMAO | Near-real-time model | **Adopt later / skip for the demo** — aerosol *numbers* should stay on MERRA-2 AOD via GIBS |
| DYAMOND / ECCO-2 / MERRA-2 original model output | The models behind 5196, 3912/5425, and 4960 | None for the browser | “Not provided by SVS” in Pack B, correctly | Varies; often Earthdata | Huge | NASA / partners | Model output | **Skip** as a browser source. Use the SVS derivatives and, for numbers, the GIBS/NOAA/NSIDC paths already in the plan |
| NSIDC Sea Ice Index G02135 v4 | Official September extent series (named in the team plan) | Pack B marks this **MISSING**. The repo already snapshots it | Already in the project; no new file in the zips | None | CSV | Cite Fetterer et al. (DOI still `[citation needed: Basmala]`) | Snapshot already in `public/data/snapshots/nsidc/` | **Skip as a new source** — already adopted. Do not treat the pack’s “missing” note as a project gap |
| Research sonification formula `frequency_hz = 440 × 2 ** (((Ci / C0) − 1) / 0.10)` with 0.8 s sine tones | A relative-change pitch mapping for the 5-row CO sample | None. Conflicts with the shipped Earth Sonification Language | n/a | n/a | n/a | Design encoding, not a NASA product | n/a | **Skip** as a product mapping. Keep the documented caveats (not a physical sound, not AQI, not health risk) |
| 5,760–9,600 px SVS movies, 32:9 EIC masters, EXR/TIFF frame sets, `CO.mov`, `CO_GIF.gif` | Full-resolution masters | None for the web app | Official SVS URLs | None | 55 MB–536 MB each, some frames “unknown” and huge | NASA media guidelines; some produced videos include licensed music | Snapshot only | **Skip** for the site. Download later only to cut a short WebM, never to serve raw |
| Team-package WebP/JPEG re-encodes of NASA stills | Shareable copies at source resolution | Team handoff only | Local files under `NASA_Images/Compressed/` | n/a | 1 KB–1.6 MB | Derivatives of NASA media; credit the official item, not the WebP as an original | Local derivatives | **Adopt later / with care** — fine as a working preview. Ship official NASA files (or a pipeline-generated, credited derivative) in the product |
| Prior Node.js/Express + Web Audio MVP notes (checkpoint `6b79a3a`) | Description of an earlier CO-only prototype | None. That is not this Next.js repo | n/a | n/a | n/a | n/a | n/a | **Skip** — do not port that stack or its `/api/co-sample` design into `develop` |

## 5. Duplicates (already in the plan or repo)

These items are real and useful, but they are not new discoveries. Keep the official URLs and credits from the packs; do not start a second inventory.

- SVS 5533, 5669, 5196, 5425, 3912, 4960, 4950, 5011, and the SVS EIC gallery — already in `sources.json` and the addendum.
- GEOS-CF datashare, GEOS-FP, MERRA-2, GIBS layers (AOD, LIS, GEDI, IMERG, AMSR2, AIRS), NSIDC, FIRMS, Open-Meteo, OpenAQ, EONET — already in the addendum.
- GEDI SVS 4950 and ISS LIS SVS 5011 — the research report set these aside for “access difficulty.” Our plan already uses the same science via GIBS (and keeps the SVS pages for visuals). That earlier selection is a process note, not a reason to drop them.
- Standard NASA media-guidelines wording and “Uses NASA data; not endorsed by NASA.”

## 6. What is wrong, incomplete, or in conflict

1. **Wrong product shape.** The research report treats a five-record GEOS-CF CO demo at 49°N, 120°W as the MVP. Earth Listens on `develop` is already a multi-layer jukebox (temperature, wildfire, sea ice, CO₂, night lights, oceans, aerosols, air quality, lightning) with Cairo/Egypt as a featured view. The sample is a valuable fixture, not the product dataset.
2. **Conflicting sonification.** The pack’s 440 Hz relative-change sine mapping must not replace `docs/SONIFICATION.md` / Tone.js registers, timbres, or spatial rules. Pitch in this project is a documented design encoding of normalized values, not of `Ci / C0`.
3. **Unit and location mismatch.** `air_quality.config.json` is in µg/m³ with Egypt/Cairo cameras and yearly steps. The validated sample is CO in mol mol⁻¹ (converted to ppbv) for five hours at 49°N, 120°W. Putting those five rows into the existing layer would be scientifically wrong.
4. **“GEDI and lightning were not selected” is outdated.** The addendum already plans LIS lightning (core) and GEDI (use / past the cut line) through GIBS. The research pack did not obtain those files; that does not mean they are unavailable to us.
5. **“NSIDC sea ice is missing” is true of Pack B, false of the project.** `public/data/snapshots/nsidc/` and `sources.json` already include G02135 v4.
6. **“No challenge resource covers sea ice” is too strong.** SVS 5425 includes an official sea-ice-only overlay, and the plan already uses NSIDC plus AMSR2 on GIBS.
7. **Pack B MERRA-2 “data location not provided by SVS”** is correct for SVS, but we already have MERRA-2 AOD and 2 m temperature as GIBS layers.
8. **The Node/Express MVP and git checkpoint `6b79a3a` are not this repository.** Follow the current Next.js app, its proxy-free live feeds, and its existing API routes.
9. **Internal inconsistency in the lightweight zip.** `NASA_Media_Not_Included.txt` still says the three SVS 5533 16:9 videos “ARE INCLUDED in `NASA_Videos/`.” In this share zip they are link-only, as `README.txt` and `NASA_Video_Download_Links.txt` correctly state.
10. **Incomplete catalogs, now partly repaired.** Pack B’s 5669, 5425, 3912, and 4960 lists were excerpts. This review confirmed 4960 (including the 68.6 MB HD WebM and captions) and 5425 (including temperature, salinity, and sea-ice versions) from the official API. 3912 and 5669 should still be read from the live page before a download script is finalized.
11. **SVS 14439 is broader than the pack said.** The official API also lists ozone, PM2.5, and nitrogen-oxide animations. Use those if the files are compact; do not assume they are all 3.5 MB WebMs until sizes are measured.
12. **ATTRIBUTION.md cites SVS 5113** (VIIRS active fires, confirmed live). Pack B listed 5110 instead and did not collect either. 5113 is the citation to keep; add it to `sources.json` when used.

## 7. Integration plan (PRD for a coding agent)

Work on `develop`. Do not merge to `main`. Do not commit secrets. Do not push. Do not change the Earth Sonification Language. Do not mark a file `sample: false` unless the values came from a listed URL, with `retrieved` and `sha256` recorded.

### 7.1 Add the missing sources and credits first

1. Append to `public/data/sources.json` (no invented checks): `svs-14439`, `svs-5153`, `svs-5151`, `svs-5152`, `svs-5154`, `svs-5572`, `svs-5552`, `svs-5518`, `geos-cf-opendap` (the collection URL, not a pasted query with secrets — there are none), `gmao-knowland-1446`, and `gmao-lucchesi-1203`. Add `svs-5113` only if a fire still or clip is actually used.
2. Update `ATTRIBUTION.md` and the `/data` credits with the official lines in §4. Keep “Uses NASA data; not endorsed by NASA.” Add the 5572 Zenodo DOI. State that GEOS-CF/GEOS-FP visuals are **modeled**, not station measurements or AQI. Keep the GISTEMP / NOAA GML / NSIDC citation strings marked `[citation needed: Basmala]` until Basmala verifies them — this pack does not settle those.
3. Fold the scientific caveats into the air-quality explanation and the sources page: historical vs live; modeled vs ground station; layer 72 is a model index, not 72 m or 72 mbar; mask `1e15` as missing, never zero; SVS 5533/14439/5153 are contextual and are not synchronized to a point sample unless a later query proves it.

### 7.2 Ship compact intro media (closes the SVS-clip gap)

Follow the existing six intro chapters in the addendum. Swap stand-in visuals; keep scroll timings, EN/AR narration slots, and reduced-motion stills. No autoplay. Lazy-load every movie. Do not add three.js, Tone.js, or Theatre.js to the initial JS bundle.

Suggested official files (download from SVS, then re-encode if needed; host on R2, not in git if over a few hundred KB):

1. Night-lights chapter — already planned (Black Marble). Unchanged by this research.
2. Ocean chapter — silent 1080p excerpt of SVS 5425 beauty shot, re-encoded to WebM ≤ 8 MB, with the official print still as the reduced-motion fallback. Do not use SVS 14745 (licensed music).
3. Aerosols chapter — SVS 5669 1920×1080 still, or SVS 5572 `Aerosols_EarthRotating_1920x1080.png` (1.5 MB) plus `Aerosols_cbar.png`. Optional later: SVS 5552 `SOS_Aerosols_1024x512.png` as a globe texture.
4. Air-quality chapter — SVS 5533 `AirQuality_WithLabels_1920x1080_0000.png` and/or the compact SVS 14439 `CO.webm` (3.5 MB, user-controlled). Prefer `CO.00040_print.jpg` and the 5153 color bar as the still/legend.
5. Optional CO₂ chapter — SVS 5196 1080p 6.9 MB orbit clip. Say clearly this is a 2020 DYAMOND model visualization; Mauna Loa remains the number source.
6. Optional precipitation chapter — SVS 4960 still + official English `.vtt`. If a clip is used, cut a short WebM ≤ 8 MB from the official 68.6 MB HD WebM. Pair the story with IMERG numbers only when those frames exist.

Budget: keep all intro video under the addendum cap (videos ≤ 25 MB total, prefer ≤ 8 MB each). Prefetch nothing on `/listen` or `/tutorial`.

### 7.3 Replace SAMPLE air-quality numbers carefully (does not close the gap in one step)

1. Add the validated five-record file as a **test fixture** only (for example under `pipeline/` or `src/**/fixtures/`), with the source URL, date, coordinates, layer note, conversion `ppbv = CO × 1e9`, and sentinel rule. Assert that a parser matches the five official values.
2. Build a **server-side** GEOS-CF OPeNDAP adapter (Next.js route or the existing snapshot job). Do not call NCCS from the browser. Guardrails: fixed collection path, allow-listed variable and index bounds, timeout, and a small response cap. No open proxy.
3. After reading Knowland1446, query a short historical window at a Cairo/Egypt cell for the variables the air-quality layer actually uses. The current UI unit is µg/m³, so prefer a PM2.5 (or documented equivalent) field if it exists in this collection; do not convert CO ppbv into µg/m³ without a stated formula. If only `co` is practical before the demo, add a clearly labeled CO series — do not overwrite the PM2.5-style `air_quality` layer with the wrong quantity.
4. Snapshot the successful query beside the other feeds. Set `sample: false` only on that snapshot. Live Cairo air quality stays on Open-Meteo, with OpenAQ optional when `OPENAQ_API_KEY` is present.
5. Leave aerosol history on MERRA-2 AOD via GIBS, and lightning on LIS via GIBS. This research does not provide those series.

### 7.4 What not to do in this pass

- Do not implement a second sonification engine for the 5-row preview.
- Do not commit 100 MB+ SVS masters, EXR/TIFF frame packs, or the compressed team WebP folder as if it were official NASA media.
- Do not claim the intro clips are live data, Egypt, or AQI.
- Do not treat Pack B’s empty `Sea_Ice/` folder as a need for placeholder ice data.
- Do not add new credentials for this work. OPeNDAP and SVS need none.

### 7.5 Acceptance checks

- `sources.json` lists every SVS id and document actually used, with license and “key: none” where true.
- Intro chapters show credited stills under `prefers-reduced-motion`, and any video is user-started, captioned or described, and lazy-loaded.
- The OPeNDAP fixture test passes against the five official values. A Cairo (or documented) snapshot, if shipped, validates in the existing data schema and is not labeled SAMPLE.
- Lighthouse on Listen and Tutorial does not regress because of the new media (no new global JS; no auto-download of > 8 MB).
- Secret scan stays clean.

## 8. Credentials this research adds

**None.** GEOS-CF OPeNDAP, NASA SVS, and the GMAO PDFs need no key.

Unchanged from the existing plan, and still not supplied by this research:

- **Vercel (required for the running site):** `GROQ_API_KEY`, `FIRMS_MAP_KEY`, `CRON_SECRET`.
- **Vercel (recommended):** `GEMINI_API_KEY`, `OPENAQ_API_KEY`.
- **Vercel (optional):** `OPENROUTER_API_KEY`, `NEXT_PUBLIC_ASSET_BASE_URL`.
- **GitHub Actions only:** R2 access keys, plus `FIRMS_MAP_KEY` for the snapshot job.
- **Not required for these sources:** `NASA_API_KEY`, `EARTHDATA_TOKEN`.

## 9. Suggested adopt-now order

1. Credit and source-list updates (Knowland, Lucchesi, official SVS lines, 5572 DOI, caveats).
2. Compact intro stills: 5533 1920 labeled, 5669 or 5572 1920 aerosol still + color bar, 14439/5153 CO print still + color bar.
3. Compact intro clips: 14439 `CO.webm` (3.5 MB), 5196 1080p (6.9 MB), 5425 silent excerpt re-encode.
4. 4960 captions (and a short re-encode later if time).
5. OPeNDAP fixture + server adapter, then a documented Cairo/Egypt snapshot if the variable and unit can be aligned with the air-quality layer.
6. 5552 equirect aerosol still as a globe texture if the layer work is already in progress.
