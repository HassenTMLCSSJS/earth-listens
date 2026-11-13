# Earth Listens: Final PRD and Agent Prompt (v5)

Owner: Hassan Ahmed. Repo: https://github.com/HassenTMLCSSJS/earth-listens. Written 13 Nov 2026, 16:30 Cairo time.
Companion docs (read first): `PRD_v4_REMAINING_WORK.md`, `DATA_INTEGRATION_ADDENDUM.md`, `research-intake/RESEARCH_REVIEW.md`, `visuals/Zain-Work-Guide.pdf`, and the repo's `docs/` folder.

This file overrides PRD v4 in two places: **every optional data view (Phase C) is now P0**, and **GitHub Actions is unavailable** (Hassan's account is blocked from running Actions). Everything runs locally or on Vercel.

---

## 0. Current state (verified 13 Nov)

| Area        | State                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `main`      | develop merged in (release v0.2-data); Next.js deployed on Vercel (Hobby, daily cron)                                                           |
| CI          | Workflows exist but must not be relied on. Run checks locally before every PR                                                                   |
| Backend     | Done: pipeline, registry, colormap decoding, 8 live feeds + snapshots + `?demo=1`, agent route with Groq→Gemini→OpenRouter, cron snapshot route |
| Real data   | Night lights 2012/2016, one MUR SST frame, 2K Blue Marble + ETOPO                                                                               |
| SAMPLE data | 9 of 10 layer histories (temperature, CO₂, sea ice, wildfire, ocean, aerosols, air quality, lightning)                                          |
| R2          | Bucket `earth-listens-assets`, public URL `https://pub-f4844155e9804bb5adcb0c121896e82b.r2.dev`. Nothing uploaded yet                           |
| Perf        | Lighthouse perf: listen?demo=1 0.80, tutorial 0.81 (target ≥ 0.85); JS about 2.1 MB gzip (target ≤ 450 KB on /listen)                           |
| Frontend    | Placeholder UI. Real design = Phase D (Zain + Youssef)                                                                                          |

---

## 1. Credentials and secrets

**Never commit, print or paste values.** On Hassan's box all values live in `/workspace/earth-listens/secrets/.env.local` (mode 600). An agent copies the needed names into its local `.env.local` in the repo root (git-ignored) or exports them in the shell.

| Name                                                                                             | Used by                                                                | Where to set                                                           |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (=earth-listens-assets) | `scripts/upload-r2.mjs` (local)                                        | local shell only                                                       |
| `R2_S3_ENDPOINT`                                                                                 | S3 clients (`https://<account>.r2.cloudflarestorage.com`)              | local shell only                                                       |
| `R2_USER_TOKEN`                                                                                  | Cloudflare API (bucket config, CORS, custom domain)                    | local only                                                             |
| `FIRMS_MAP_KEY`                                                                                  | FIRMS Area API (live + regional history)                               | Vercel + local                                                         |
| `GROQ_API_KEY` (required), `GEMINI_API_KEY`, `OPENROUTER_API_KEY`                                | agent                                                                  | Vercel                                                                 |
| `OPENAQ_API_KEY`                                                                                 | OpenAQ stations                                                        | Vercel + local (get a free key at https://explore.openaq.org/register) |
| `CRON_SECRET`                                                                                    | `/api/cron/snapshot`                                                   | Vercel (generated; see `secrets/vercel.env`)                           |
| `EARTHDATA_TOKEN`                                                                                | only if a raw DAAC download is needed (https://urs.earthdata.nasa.gov) | local                                                                  |
| `NEXT_PUBLIC_ASSET_BASE_URL`                                                                     | unset = r2.dev URL; `off` = repo 2K files                              | Vercel                                                                 |

Remove `REVALIDATE_SECRET` from `src/core/env.ts` and `.env.example` (unused).
After the hackathon: rotate the R2 token and keys, the Cloudflare API token and the FIRMS key (they were pasted in chat).

---

## 2. Rules for any agent

1. Branch from latest `develop`: `feat/<topic>`. One PR per phase item. PRs go into `develop` (squash); Hassan merges. `develop → main` uses a merge commit and a tag. **No force-push. Never commit to main or develop directly.**
2. Before opening a PR, run locally and paste the real output in the PR template's "Measured results":
   `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm py:test && pnpm data:validate && pnpm build && pnpm exec playwright test`
   Lighthouse locally: `pnpm build && pnpm start` then `npx @lhci/cli autorun` (config in `lighthouserc.json`).
3. Never fetch NetCDF/HDF/GeoTIFF in the browser. The pipeline (Python, `pipeline/`) makes small derivatives: JSON value grids, WebP/KTX2 frames. Every output file states `source`, `license`, `retrieved`, `units`, and `sample: false`.
4. Files over 3 MB never go in git. They go to R2 under `v1/<layer>/...` and are listed in `public/data/assets-manifest.json` (create it if missing) with size and sha256.
5. Every new source goes into `public/data/sources.json`, `ATTRIBUTION.md` and the `/data` page with its credit line.
6. Keep `?demo=1` working offline. Keep accessibility at 1.00 and Lighthouse perf at ≥ 0.85.
7. Sonification stays deterministic: the same snapshot gives the same score. New layers use the existing Earth Sonification Language (ESL) in `src/modules/sonification/`. Add a mapping, don't invent a new engine. Never use the research pack's "440 Hz × value" formula.

---

## 3. Phase A: demo-critical (P0)

| ID  | Task                                                                                                                                                                                                                                                                               | Acceptance                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A1  | Remove `REVALIDATE_SECRET`                                                                                                                                                                                                                                                         | env tests pass                                                                          |
| A2  | Perf: lazy-load Tone.js (on first user gesture), the three/r3f scene (`next/dynamic`, `ssr:false`) and Theatre (dev Studio only). Split per-view chunks; keep `?demo=1` working                                                                                                    | listen and tutorial ≥ 0.85; /listen JS ≤ 450 KB gzip, or the documented best            |
| A3  | Real histories from CSVs already in the repo: GISTEMP 1880–2025, NOAA GML CO₂ 1958–2026, NSIDC September extent 1979–2026. Fix the schema that rejects global-only series                                                                                                          | `sample:false`; banner hidden for these layers                                          |
| A4  | Air quality from GEOS-CF via OPeNDAP (no key). Collection `aqc_tavg_1hr_g1440x721_v1`, 0.25°, hourly, 2018-01-01 → 2026-01-02; `1e15` = missing; Cairo cell [lat 480][lon 845]. Gas µg/m³ = ppbv × MW / 24.465. Exact URLs and sample values: `research-intake/RESEARCH_REVIEW.md` | Monthly means 2018–2025 for PM2.5, O₃, NO₂, CO, global grid at low res + a Cairo series |
| A5  | Aerosols and lightning frames from GIBS (see Phase C table)                                                                                                                                                                                                                        | real frames, `sample:false`                                                             |
| A6  | R2 upload (section 6) and verify the site loads 4K/8K                                                                                                                                                                                                                              | `curl -I` 200 + CORS header from the r2.dev URL; globe shows 4K on a laptop             |
| A7  | Vercel preview check: live, snapshot and demo on a phone and a laptop                                                                                                                                                                                                              | checklist in the PR                                                                     |
| A8  | `develop → main` merge commit, tag `v0.3-data`                                                                                                                                                                                                                                     | —                                                                                       |

---

## 4. Phase C: data views (ALL P0 now)

### 4.1 How to get GIBS layers (no key)

- Capabilities: https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/WMTSCapabilities.xml
- Layer docs and colormaps: https://nasa-gibs.github.io/gibs-api-docs/available-visualizations/ and `https://gibs.earthdata.nasa.gov/colormaps/v1.3/<Layer>.xml`
- WMS snapshot (one image per date): `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=<Layer>&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=2048&HEIGHT=1024&FORMAT=image/png&TIME=<YYYY-MM-DD>`
- **The exact layer identifier must be confirmed by grepping the capabilities XML for the keyword below. The names here are search hints, not guaranteed IDs.** Pick the colormapped-value variant, and decode PNG colours to values with the layer's colormap XML using the existing decoder in `pipeline/`.

### 4.2 The views

| View                              | Source                                                                                                                                                                                                            | How to get it                                                                                                                                                                           | Frames to make                                                                                        | Visualization                                                                                          | Music (ESL)                                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Temperature frames**            | MERRA-2 2 m air temperature, monthly (GIBS; grep `MERRA2` + `Air_Temperature`)                                                                                                                                    | WMS monthly, 1980 → latest                                                                                                                                                              | 1 frame per year (Jan or the annual mean of 12), 1980–2025, 1024×512 WebP + a 360×180 value grid JSON | Globe texture blended over Blue Marble, diverging blue→red; numbers on the chart still from GISTEMP    | Value grid sampled under the playhead/cursor: temperature → pitch (cold low, hot high), anomaly vs. 1981–2010 → brightness (filter cutoff) |
| **Sea ice**                       | AMSR2 sea-ice concentration (GIBS; grep `AMSR` + `Sea_Ice`), daily 2012-07 → 2025-09; numbers from NSIDC CSV                                                                                                      | WMS one date per September and March each year, polar crops                                                                                                                             | 2 frames per year, 2012–2025                                                                          | Polar cap opacity = concentration; camera flies to the Arctic                                          | Extent (NSIDC) → sustained pad volume; shrinking → descending pitch glide; concentration under the cursor → pad density                    |
| **Forest height (GEDI)**          | GEDI L3 canopy height mean, 1 km, 2019-04 → 2023-03 (GIBS; grep `GEDI`); L4B biomass optional                                                                                                                     | Single cumulative WMS image at 4096×2048 + value grid                                                                                                                                   | 1 static layer                                                                                        | Height → green ramp + vertex displacement on the globe shader (small scale)                            | Height → pitch, standard deviation → detune/chorus, biomass → bass level; tropical belt sweep makes a "forest chord"                       |
| **Precipitation (IMERG)**         | IMERG precipitation rate (GIBS; grep `IMERG_Precipitation`), daily 2000 → today                                                                                                                                   | WMS daily; monthly = average of daily                                                                                                                                                   | Last 30 days (live via the snapshot route) + 12 monthly frames for one year                           | Animated rain overlay, blue ramp                                                                       | Rain rate → rhythm density (drop/hi-hat hits per beat) + volume; zero rain = silence                                                       |
| **CO₂ (AIRS)**                    | AIRS CO₂ mid-troposphere monthly (GIBS; grep `AIRS` + `CO2`), 2002-09 → 2012-02; long series numbers from NOAA GML                                                                                                | WMS monthly                                                                                                                                                                             | 1 frame per year, 2003–2011                                                                           | Purple ramp texture; clearly labeled with the date range ending 2012                                   | Numbers (NOAA) → slowly rising drone pitch; AIRS map → stereo pan of the plume (west/east)                                                 |
| **Aerosols**                      | MERRA-2 AOD 550 nm monthly 1980 → latest (grep `MERRA2` + `Aerosol_Optical`); dust PM2.5 (grep `Dust`); SVS 5552 equirect still as a texture                                                                      | WMS                                                                                                                                                                                     | 1 frame per year 1980–2025 + 12 months of the latest year                                             | Haze overlay; four species (dust, sea salt, smoke, sulfate) from SVS 5669 for the hero still           | AOD → volume + low-pass "muffling"; four species → four timbres (dust grainy, salt bright, smoke dark, sulfate glassy)                     |
| **Lightning**                     | ISS LIS flash count (GIBS; grep `LIS` / `Lightning`), 2017-03 → 2021-09; climatology layer                                                                                                                        | 18 seasons (MAM 2017 → JJA 2021), one 10-day composite each, about 180 requests                                                                                                         | 18 frames                                                                                             | Flash points as additive sprites, flicker                                                              | Flash count → percussion trigger density; radiance → velocity; seasons = sections                                                          |
| **Natural events (EONET)**        | NASA EONET v3, no key: https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30 (docs: https://eonet.gsfc.nasa.gov/docs/v3)                                                                                  | Live route handler + snapshot                                                                                                                                                           | Live list (≤ 200 events)                                                                              | Instanced markers by category (wildfire, storm, volcano, sea/lake ice, flood), with a tooltip and link | Event earcons per category (storm = low swell, volcano = rumble, fire = crackle), triggered when the playhead passes the event longitude   |
| **Air-quality stations (OpenAQ)** | OpenAQ v3 (key): https://api.openaq.org/v3/locations?coordinates=30.0444,31.2357&radius=25000 then `/v3/locations/{id}/latest` (docs: https://docs.openaq.org)                                                    | Server route only (key never in the client), 1 h cache, snapshot fallback                                                                                                               | Cairo + world top-N stations                                                                          | Dots sized/colored by PM2.5 (WHO bands)                                                                | Same 4-voice chord as GEOS-CF; clicking a station solos its chord. If Cairo coverage is empty, show Open-Meteo/CAMS and say so             |
| **Fire history (FIRMS)**          | FIRMS Area API (key): `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{FIRMS_MAP_KEY}/VIIRS_NOAA20_SP/{west,south,east,north}/{days 1-10}/{YYYY-MM-DD}` (docs: https://firms.modaps.eosdis.nasa.gov/api/area/) | Pipeline: regions (Amazon, Australia, California, Mediterranean, Siberia, Central Africa), one 10-day window per month for the last 5 years. Mind the 5,000 transactions / 10 min limit | Per-region monthly counts JSON + hotspot points (≤ 20k per frame, gzip)                               | Points as glowing heat sprites; region bar chart                                                       | Fire count → crackle density; FRP → brightness; region → pan position                                                                      |
| **Ocean (existing upgrade)**      | MUR SST daily (already decoded) + Perpetual Ocean 2 (SVS 5425/5505)                                                                                                                                               | Monthly MUR frames 2003–2025 (one date per month for the latest year, yearly otherwise)                                                                                                 | 23 + 12 frames                                                                                        | SST ramp + flow video texture                                                                          | SST → pitch; currents speed → tempo/arpeggio rate                                                                                          |

### 4.3 Implementation pattern (same for every view)

1. `pipeline/earth_pipeline/sources/<layer>.py`: fetch → decode to values with the colormap → write `public/data/layers/<layer>/<frame>.json` (value grid, uint8/uint16 quantized + scale/offset) and `<frame>.webp`. Large or 4K/8K output goes to `release-assets/<layer>/`.
2. Register in `public/data/sources.json` and the layer registry (`src/core/` / `src/modules/layers/`, following existing layers like `night_lights`).
3. zod schema for the file; a `pnpm data:validate` case.
4. ESL mapping in `src/modules/sonification/` (constants + a mapping function) + unit tests: deterministic snapshot, edge values, missing data = silence.
5. Globe material uniform/texture slot, lazy loaded per view; mobile = 1024 px frames.
6. UI: layer chip, legend with units, source credit, "sample" banner off.
7. Tests: Vitest for the decoder and mapping, Playwright for switching to the view in en/ar and in demo mode.

---

## 5. Phase B: research sources (P0 for credits, P1 for media)

- B1: add SVS 14439, 5151–5154, 5533, 5196, 4960 (captions), 5425, 5552, 5572 (DOI 10.5281/zenodo.16782523), 5669, the GEOS-CF OPeNDAP source, and the Knowland (GEOS-CF file spec, GMAO Office Note 17) and Lucchesi (GEOS FP file spec, GMAO Office Note 4) citations to sources/ATTRIBUTION/`/data`. Item pages: `https://svs.gsfc.nasa.gov/<id>`; metadata API: `https://svs.gsfc.nasa.gov/api/<id>`.
- B2–B4: "Real NASA view" cards with short clips (≤ 8 MB WebM, re-encode with ffmpeg; big ones go to R2). Do not use SVS 14745 (licensed music). Do not download the 286–537 MB movies.

## 6. R2 upload (run locally; Actions unavailable)

```bash
cd earth-listens && git checkout develop && git pull
set -a; source /workspace/earth-listens/secrets/.env.local; set +a   # never echo
pnpm install --frozen-lockfile
pnpm py:install 2>/dev/null || (cd pipeline && pip install -e .)
# build derivatives (see pipeline README / package.json "data:*" scripts)
pnpm data:build            # or the pipeline commands listed in package.json
node scripts/upload-r2.mjs --dir release-assets        # dry run, lists files
node scripts/upload-r2.mjs --dir release-assets --yes  # upload
curl -sI https://pub-f4844155e9804bb5adcb0c121896e82b.r2.dev/<one-key> | head -5
```

- Object keys `v1/<layer>/<file>`, `Cache-Control: public, max-age=31536000, immutable`, correct `Content-Type` (image/ktx2, image/webp, application/json, video/webm).
- CORS already allows GET/HEAD. If a custom domain is added (recommended; r2.dev is rate-limited), update `NEXT_PUBLIC_ASSET_BASE_URL` and the CSP allowlist in `src/core/csp.ts`.
- The GitHub release `data-v1` is the archive: `gh release create data-v1 release-assets/**` when `gh` is logged in. Optional.

## 7. Phase D: visuals (Zain + Youssef)

Per `visuals/Zain-Work-Guide.pdf`. First merge the deps PR (Theatre.js + svg.js, regenerate `pnpm-lock.yaml`) and the dev-only CSP `unsafe-eval`. Then the 8-scene intro, Sada, models, globe shader polish, svg.js logo, UI redesign of every page (the current UI is a placeholder), and the e2e update for 8 chapters.

## 8. Phase E: wrap-up

Narration MP3s (en/ar), `/data` citations check, README screenshots, final QA (axe 0 serious/critical, a11y 1.00), demo script, freeze, then key rotation.

## 9. Order and time (rough)

A1 → A3 → A4 → A5 + C views (in this order: temperature, sea ice, aerosols, lightning, precipitation, forest, EONET, OpenAQ, FIRMS history, CO₂, ocean) → A6 upload → A2 perf → B1 → A7 → A8. Phase D runs in parallel on separate branches.

---

## 10. Copy-paste prompt for any AI coding agent

> You are completing the **Earth Listens** project (NASA Space Apps Cairo 2026): a Next.js 16 + TypeScript + r3f/three + Tone.js web app that turns NASA Earth data into music on an interactive globe, with a Python data pipeline in `pipeline/`. Repo: https://github.com/HassenTMLCSSJS/earth-listens. Work from the latest `develop`.
>
> **Read first:** `PRD_FINAL_AGENT.md` (this file; it's the source of truth), then `docs/`, `README.md`, `package.json` scripts, `pipeline/`, `src/modules/sonification/`, `public/data/sources.json`, `scripts/upload-r2.mjs`, `src/core/env.ts`, `src/core/csp.ts`.
>
> **Goal:** finish Phases A, B1 and C exactly as written in sections 3–6: replace every SAMPLE history with real NASA/NOAA data, build all 11 data views with both visualization and ESL music mapping, upload large assets to Cloudflare R2, and hit the perf and accessibility targets.
>
> **Credentials:** load them from the environment (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_S3_ENDPOINT`, `FIRMS_MAP_KEY`, `OPENAQ_API_KEY`). Hassan provides them in a git-ignored `.env.local` or as shell exports. Never print, log, commit or paste a secret value. Never prefix a server key with `NEXT_PUBLIC_`.
>
> **Rules:** follow section 2 strictly. One branch and PR per item (`feat/<topic>` → `develop`). Run the full local check command before every PR and paste the real results into the PR template (GitHub Actions is unavailable, so local results are the evidence). No force-push, no commits to main/develop, no files over 3 MB in git (R2 instead), no browser fetches of raw scientific formats, keep `?demo=1` offline mode working, keep a11y 1.00, perf ≥ 0.85. Confirm every GIBS layer ID against the capabilities XML before using it. Don't guess IDs. Never invent data: if a source fails, keep the snapshot and report it.
>
> **Deliver per PR:** what changed, the files touched, sources added (with credit lines), measured results, screenshots of the view in en and ar, and any blocker. At the end, a summary table: each layer → real/sample, frame count, R2 keys uploaded, ESL mapping, test status.
>
> Stop and ask Hassan before: merging anything, changing repo settings, deleting R2 objects, or spending money.
