# Earth Listens: PRD v4, all remaining work

**Prepared:** Friday 13 November 2026, 15:30 Cairo time (UTC+2)
**Event:** NASA Space Apps Cairo 2026, live 13–14 November 2026. Submission deadline: confirm with Space Apps Cairo (the README still says "to be confirmed").
**Team Ctrl+Earth:** Hassan Ahmed (data, backend, AI agent, merges everything) · Zain Eldin (UI/UX and 3D) · Youssef Alnaggar (front end) · Nesma Nassar (video and story) · Basmala Samy (research).
**Repo:** `https://github.com/HassenTMLCSSJS/earth-listens`. Baseline for this PRD: `origin/develop` at `d3e5634` (merge of PR #3 `feat/data-integration`, merged 13 Nov 2026 13:57 Cairo time).
**Inputs checked:** the repo at `d3e5634`, PR #3 body and checks, CI on `main`, `DATA_INTEGRATION_ADDENDUM.md` (v3), `research-intake/RESEARCH_REVIEW.md`, `visuals/Zain-Work-Guide.pdf` and `visuals/zain-guide-src/` (build sources and `starter-kit/`), the v3 full plan, and the live GEOS-CF OPeNDAP `.info` page (fetched today).

This document has **no key values**. Secret names only.

---

## 0. How a coding agent uses this PRD

Work one PR at a time, in the order of section 3. For every PR:

1. `git fetch origin && git switch -c <branch> origin/develop`.
2. Touch only the files listed. A path marked **CREATE** does not exist yet; every other path exists on `origin/develop` today.
3. Run the local gate before pushing: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm data:validate && pnpm test && pnpm build`, then `pnpm test:e2e`. For pipeline work, also `pnpm py:test`.
4. Open a PR into `develop`. Fill the PR template with measured numbers only.
5. **Hassan approves and merges every PR.** Feature PRs are squash-merged into `develop`. `develop` → `main` uses a merge commit. No force-push, no history rewrite, no direct commits to `develop` or `main`.

Hard rules, inherited from the addendum and the research review:

- **No fabricated data.** A file is `sample: false` only if every number came from a listed URL, with `source.retrieved` and `source.sha256` filled (the zod refinement in `src/modules/data/schemas/layer.ts` already enforces this). Missing days are never filled.
- **Do not change the Earth Sonification Language** (`docs/SONIFICATION.md`, `src/modules/sonification/*`). Same snapshot → same score. Update `src/modules/sonification/__snapshots__/score.test.ts.snap` only on purpose, and say why in the PR.
- **Never commit or print a secret.** `/workspace/earth-listens/secrets/.env.local` is never read into a doc, a log or a commit.
- **The browser never calls NCCS, SVS or FIRMS directly.** New upstreams are fetched by the pipeline or a server route.
- **New dependency with an install script →** add it to `pnpm-workspace.yaml` `allowBuilds` (`true` or `false`) in the same PR, or CI fails with `ERR_PNPM_IGNORED_BUILDS`.
- **Accessibility stays 1.00** on every Lighthouse URL in `lighthouserc.json` (the gate is an error below 1).

---

## 1. Status: done vs. remaining

| Area                                                           | Status                                                                                                                                | Evidence                                                                                                                                                                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base MVP (PR #1)                                               | **Done**, in `develop`                                                                                                                | `07ea66f`                                                                                                                                                                                                                                 |
| CI fix (`ERR_PNPM_IGNORED_BUILDS`, setup-node before corepack) | **Done, merged** into `develop` via PR #3                                                                                             | `56f2854`, `8bc8c3d`; `pnpm-workspace.yaml` `allowBuilds` sets `onnxruntime-node: false`, `protobufjs: false`; `ci.yml` sets `package-manager-cache: false`                                                                               |
| Data integration (PR #3)                                       | **Done, merged** 13 Nov 13:57 Cairo                                                                                                   | 4 checks green on `44fe169` (web, e2e, lighthouse, pipeline); Vitest 82 passed, lines coverage 91.91%; Playwright 25/25; Lighthouse a11y 1.00 on all 6 URLs                                                                               |
| Performance                                                    | **Remaining (P0)**                                                                                                                    | PR #3 CI run: `/en/listen?demo=1` 0.80, `/en/tutorial` 0.81. `docs/validation/perf.md` (earlier run): 0.84 / 0.84. Target ≥ 0.85                                                                                                          |
| JS bundle                                                      | **Remaining (P0)**                                                                                                                    | ~2.1 MB gzip across all chunks (PR #3); 2.21 MB (Zain guide); 2.20 MB summed over `.next/static/**/*.js` in today's local build. Largest chunk 882 KB gzip (PR #3), the kokoro/onnxruntime voice chunk, already loaded through `import()` |
| `main` branch                                                  | **Broken CI**                                                                                                                         | `main` is at `7950683` (base MVP, before the CI fix): `web` failure, `e2e` and `lighthouse` skipped. Fixed by merging `develop` → `main` (A8)                                                                                             |
| Real data in the repo                                          | Night lights 2012/2016 (real), MUR SST 15 Aug 2024 frame (real), 2K NASA textures + ETOPO (real), 8 live feeds with bundled snapshots | `public/data/layers/night_lights.json` is the only layer file with `sample: false`                                                                                                                                                        |
| SAMPLE histories                                               | **Remaining (P0)**                                                                                                                    | Every other layer in `public/data/registry.json` points at a `*.sample.json` (temperature, wildfire, sea_ice, co2, ocean_sst, ocean_currents, aerosols, air_quality, lightning). Frames under `public/frames/` are SAMPLE                 |
| R2                                                             | Bucket `earth-listens-assets` created, public URL `https://pub-f4844155e9804bb5adcb0c121896e82b.r2.dev`, CORS open                    | Release `data-v1` **not created**, nothing uploaded, R2 access key **not created**                                                                                                                                                        |
| Research sources                                               | Reviewed (`RESEARCH_REVIEW.md`)                                                                                                       | The 11 ids in review §7.1 are missing from `public/data/sources.json` (B1)                                                                                                                                                                |
| Visual track (Zain)                                            | Guide + tested starter kit ready                                                                                                      | Theatre/svg.js **not installed**; `src/modules/intro/` does not exist; intro is still 6 chapters in `src/components/home-experience.tsx`                                                                                                  |
| Narration                                                      | All 22 lines × 2 locales `"status": "missing"`                                                                                        | `public/audio/narration/manifest.json` (TTS fallback covers them)                                                                                                                                                                         |
| README                                                         | Screenshot is a placeholder; text is out of date                                                                                      | `docs/screenshot-placeholder.svg`; README still says the globe texture is a procedural stand-in                                                                                                                                           |
| Vercel preview                                                 | Not checked                                                                                                                           | A7                                                                                                                                                                                                                                        |

---

## 2. Phase and priority overview

Priority key: **P0** = demo-critical, must ship · **P1** = should ship · **P2** = only if time allows. Cut line: everything P0 ships; P1/P2 degrade gracefully (SAMPLE stays labelled, missing feeds say "not live").

| Phase                      | PRs    | P0     | P1                                       | P2    | Main owner             |
| -------------------------- | ------ | ------ | ---------------------------------------- | ----- | ---------------------- |
| A · Demo-critical          | A1–A8  | 8      | 0 (custom domain is a P1 sub-item of A6) | 0     | Hassan                 |
| B · New research sources   | B1–B4  | 1      | 2                                        | 1     | Hassan, Basmala, Nesma |
| C · Missing data views     | C1–C8  | 0      | 4                                        | 4     | Hassan                 |
| D · Visuals (Zain's track) | D0–D13 | 11     | 2                                        | 1     | Zain, Hassan (D0, D13) |
| E · Wrap-up                | E1–E6  | 4      | 2                                        | 0     | All                    |
| **Total**                  | **40** | **24** | **10**                                   | **6** |                        |

Merge order: **D0 → A1 → A2 → A3 → A4 → A5 → B1 → A6 → A7 → A8 (tag `v0.2-data`)**, then B2–B4, C, the rest of D, and E. D0 goes first because it is ten minutes of work and it unblocks Zain.

---

## 3. Phase A: demo-critical (Hassan)

### A1 · Remove the unused `REVALIDATE_SECRET` — P0

- **Owner:** Hassan · **Branch:** `chore/remove-revalidate-secret` · **Estimate:** 15 min
- **Goal:** Drop a secret name that no code path uses, so nobody creates or rotates a value for nothing.
- **Facts:** `REVALIDATE_SECRET` appears only in `.env.example` (line 20), `src/core/env.ts` (lines 21 and 46) and `README.md` (line 60). No route reads it. The cron route uses `CRON_SECRET`.
- **Files:**
  - `.env.example`: delete the `REVALIDATE_SECRET=` line.
  - `src/core/env.ts`: delete the schema key and the `source.REVALIDATE_SECRET` mapping.
  - `README.md`: Vercel env sentence lists `CRON_SECRET` only.
- **Acceptance:** `rg REVALIDATE_SECRET` (excluding `pnpm-lock.yaml`) returns nothing. Typecheck, unit tests and build pass.
- **Tests:** existing `src/modules/runtime.coverage.test.ts` and Vitest suite stay green.
- **Perf budget:** none.

### A2 · Bundle and performance: Lighthouse ≥ 0.85 on Listen and Tutorial — P0

- **Owner:** Hassan (Zain follows the same rules in D-PRs) · **Branch:** `perf/lazy-heavy-chunks` · **Estimate:** 2–3 h
- **Goal:** `/en/listen?demo=1` and `/en/tutorial` reach Lighthouse performance ≥ 0.85 without breaking `?demo=1` offline, and no route's first-load JS grows.
- **What the code does today (read before changing):**
  - Tone.js is already a dynamic `import('tone')` in `src/modules/sonification/player.ts`. In demo mode `src/components/shell.tsx` also spawns `src/workers/warm-tone.ts` on mount to pre-fetch Tone.
  - `src/components/shell.tsx` runs `load()` and `import('@/modules/voice')` on mount on every page; voice then `import()`s `kokoro-js` (EN) or `@mintplex-labs/piper-tts-web` (AR). The kokoro/onnxruntime chunk is the 882 KB gzip one.
  - `src/components/globe-stage.tsx` loads `EarthCanvas` with `next/dynamic(..., { ssr: false })` and `globe.gl` only for the classic fallback.
  - Lighthouse runs `/en/listen?demo=1`, so **demo-mode preloading runs during the measured window**. That is the most likely cause of the Listen/Tutorial gap.
  - `public/sw.js` caches `/textures/`, `/frames/`, `/ramps/`, `/assets/` but **not** `/_next/static/` chunks.
- **Lazy-load scope ("the three scenes"):** the globe scene (`src/components/earth-canvas.tsx`), the intro scene (`src/modules/intro/intro-scene.tsx`, **CREATE** in D4) and the lab scene (`src/app/[locale]/lab/lab-client.tsx`, **CREATE** in D1). Plus Tone, Theatre (`@theatre/core`, `@theatre/r3f`; Studio dev-only) and svg.js.
- **Files:**
  - `src/components/shell.tsx`: move `import('@/modules/voice')` and `warmTone()` behind `requestIdleCallback` (timeout 4 s) **after** the `load` event, or the first user gesture, whichever comes first. Keep demo behaviour: in `?demo=1` the voice and Tone chunks must still be fetched before the user can go offline.
  - `src/workers/warm-tone.ts`: unchanged logic; only its trigger moves.
  - `src/components/globe-stage.tsx`: render the poster (`/textures/earth-day.jpg`) as the LCP element with `fetchPriority="high"` and explicit width/height; mount `EarthCanvas` after idle or when the stage is visible (IntersectionObserver). Keep the `?globe=gl` fallback and the no-WebGL poster.
  - `src/components/tutorial-panel.tsx`, `src/components/jukebox.tsx`: no new static imports of three, Tone, Theatre or svg.js.
  - `src/components/home-experience.tsx`: when D4 lands, the intro scene is `next/dynamic(() => import('@/modules/intro'), { ssr: false })` and loads after the gate is visible.
  - `public/sw.js`: add cache-first for `/_next/static/` (content-hashed, immutable) so the offline demo keeps working after preloads are deferred. Bump `CACHE` to `earth-listens-v2`.
  - `lighthouserc.json`: `numberOfRuns: 3` (median). Keep the a11y error at 1 and the perf warning at 0.85; after two green runs, raise perf to `error` for `/en/listen?demo=1` and `/en/tutorial`.
  - `tests/e2e/perf-budget.spec.ts` (**CREATE**): loads `/en`, `/en/listen?demo=1`, `/en/tutorial`; sums transferred JS (`resourceType === 'script'`, encoded size) before any interaction; asserts the budgets below. Also asserts no request to a `theatre`/`svgdotjs` chunk before interaction on `/en/listen`.
  - `.github/workflows/ci.yml`: in `web`, after `pnpm build`, add `! grep -rl "theatrejs-studio-root" .next/static` (from the Zain guide DoD).
  - `docs/validation/perf.md`: replace the table with the new 3-run medians and the per-route JS numbers.
- **Acceptance:**
  - Lighthouse (median of 3) ≥ 0.85 performance on `/en/listen?demo=1` and `/en/tutorial`; ≥ 0.90 still on `/en`, `/ar`, `/en/quiz`, `/en/guide`; accessibility 1.00 on all six.
  - Playwright 25/25 still green, including "demo listen survives a blocked network" and the cached-snapshot test.
  - Manual: load `/en/listen?demo=1`, wait 10 s, switch DevTools offline, play temperature → sound plays.
- **Perf budget:**
  - Initial JS transferred before interaction: `/en` ≤ 200 KB gzip (addendum §10.1); `/en/listen?demo=1` ≤ 450 KB gzip including the lazy globe (addendum §10.1 "globe page"); each lazy chunk other than the voice chunk ≤ 250 KB gzip.
  - The all-chunks total (~2.2 MB) is **not** the target; it includes lazy voice/3D chunks. Report it, but gate on per-route first load.
  - TBT ≤ 200 ms and LCP ≤ 2.5 s on Lighthouse mobile for the two routes.

### A3 · Real histories for temperature, CO₂ and sea ice from the recorded CSVs — P0 (added in v4)

- **Owner:** Hassan · **Branch:** `feat/data-recorded-histories` · **Estimate:** 1–1.5 h
- **Why this is P0:** "play temperature" is the headline demo, and `public/data/layers/temperature.sample.json` is still synthetic ("SAMPLE — shaped like GISTEMP v4"). The real files are already in the repo as recorded fixtures: `pipeline/tests/fixtures/recorded/gistemp-2026-11-13.csv` (149 lines, 1880→2025), `co2_mm_mlo-2026-11-13.csv` (864 lines, monthly 1958→Sep 2026), `nsidc-sept-2026-11-13.csv` (49 lines, September 1979→2026). Parsers exist in `pipeline/earth_pipeline/build.py` (`PARSERS`: `gistemp_annual`, `annual_co2`, `september_ice`).
- **Schema decision (needed):** `LayerDataSchema.series` is `z.record(z.enum(REGION_IDS), …)`. In zod 4 that record is exhaustive (all 8 regions required). These sources are global (GISTEMP, Mauna Loa) or Arctic-only (NSIDC). Change it to `z.partialRecord(z.enum(REGION_IDS), z.array(PointSchema))` and make the engine say "no regional series for this layer" with the existing missing earcon when a region is absent. Never copy the global series into other regions.
- **Frames:** real files ship with `frames: []` (the SAMPLE frames cannot be attached to a `sample: false` file; the refinement rejects it). The globe shows the base texture for these layers until C1/C2/C8 add real frames.
- **Files:**
  - `scripts/write-recorded-layers.py`: add writers for temperature, co2, sea_ice from the recorded CSVs, with `retrieved` (2026-11-13), `sha256` of each CSV, dataset URLs from `pipeline/earth_pipeline/fetch.py` `URLS`.
  - `public/data/layers/temperature.json`, `co2.json`, `sea_ice.json` (**CREATE**).
  - `public/data/registry.json`: point the three layers at the new files.
  - `src/modules/data/schemas/layer.ts`: `partialRecord` for `series`.
  - `src/modules/sonification/score.ts` or the caller in `src/core/store.ts` (`scoreFor`): handle a missing region (missing earcon + announcement), no fallback values.
  - `scripts/generate-quiz-truth.ts`, `public/data/quiz/clips.sample.json`, `scripts/generate-explanations.ts`, `public/data/explanations/all.json`: re-run (`pnpm data:quiz`, `pnpm data:explanations`).
  - `src/modules/sonification/__snapshots__/score.test.ts.snap`: update on purpose (inputs changed from SAMPLE to real).
  - Keep the `*.sample.json` files for unit tests that need them; nothing in the registry points at them.
- **Acceptance:** `pnpm data:validate` passes; the three files are `sample: false` with retrieved + sha256; the SAMPLE banner no longer shows for these layers; `?demo=1` plays real temperature 1880–2025; the 0 °C → 244.1 Hz check in `docs/SONIFICATION.md` still holds (range unchanged).
- **Tests:** extend `src/modules/data/integration.test.ts`: registry layers for temperature/co2/sea_ice resolve to `sample: false`; a region without a series yields a missing earcon and no note. `pipeline/tests/test_pipeline.py`: parsing each recorded CSV gives the first/last values found in the CSV.
- **Perf budget:** each layer JSON ≤ 50 KB.

### A4 · Air quality from NASA GEOS-CF OPeNDAP (no key) with ppbv → µg/m³ — P0

- **Owner:** Hassan (Basmala checks the citation lines) · **Branch:** `feat/data-geos-cf-air-quality` · **Estimate:** 2.5 h
- **Goal:** Replace `public/data/layers/air_quality.sample.json` with a real, documented GEOS-CF history for the 8 regions, keeping the layer's µg/m³ unit honest.
- **Verified today (13 Nov 2026) on the OPeNDAP `.info` page** `https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/aqc_tavg_1hr_g1440x721_v1.info`:
  - Variables: `pm25_rh35_gcc` (PM2.5 at RH 35 %), `no2` (mw 46.00 g/mol), `co` (28.00), `o3` (48.00), `so2` (64.00). Gases are "volume mixing ratio dry air" (mol/mol).
  - Grid 1440 × 721, 0.25°; lon −180 → 179.75, lat −90 → 90; one level (index 72, the surface model layer; the `.info` page labels the axis "millibar", but per the research review it is a **model layer index, not 72 hPa or 72 m**).
  - Time: hourly, `00:30Z 01 Jan 2018` → `11:30Z 02 Jan 2026` (70,164 steps). So full calendar years **2018–2025** are available; there is no 2026 history in this collection.
  - `_FillValue` / `missing_value` = `1.0E15` → treat as missing, never zero.
- **Fixture already validated** (research review §2): `chm_tavg_1hr_g1440x721_v1.ascii?co[56952:56956][0][556][240]` returns 5 values, 7.230399E-8 … 7.315437E-8 mol/mol at 49.0°N, 120.0°W, 1 July 2024. Index rules: `lat_idx = (lat + 90) / 0.25`, `lon_idx = (lon + 180) / 0.25`, `t_idx` = hours since 2018-01-01 00:30Z. Cairo (30.04°N, 31.24°E) → `[480][845]`.
- **Unit conversion (state it in the file and on `/data`):**
  - PM2.5: `pm25_rh35_gcc` is used as the layer's main `v`. Confirm its unit in Knowland et al. (GMAO Office Note 17) before shipping; the layer expects µg/m³. If the spec says otherwise, stop and flag it.
  - Gases: `ppbv = vmr × 1e9`; `µg/m³ = ppbv × MW / 24.465` (molar volume at 25 °C and 1013.25 hPa). Factors: CO 1.1445, NO₂ 1.8802, O₃ 1.9620, SO₂ 2.6160 µg/m³ per ppbv. These go into `variables.{co,no2,o3,so2}` (the schema already allows `variables: record<string, Point[]>`), never into `series`.
  - Label: "Modeled (GEOS-CF), not station measurements, not AQI. Gas µg/m³ use standard 25 °C / 1013.25 hPa."
- **Sampling (keep requests small; document it):** Cairo cell: every hour of 2018–2025 for each variable (≈ 70k values per variable). Regions (bboxes from `public/data/regions.json`): spatial stride 4 (1°) for Egypt, 20 (5°) for global/continental; time sample at 00:30, 06:30, 12:30, 18:30Z on the 1st and 15th of each month. Annual mean per region = cos-latitude-weighted mean of valid samples, `q: "estimated"` with a `source.note` describing the sampling. Request in slices with an 8 s timeout, a 5 MB response cap, an allow-listed collection path and variable list. No open proxy.
- **Where it runs:** offline pipeline only (the collection is historical). NCCS timed out from the build box earlier; WebFetch reached it today. If the box times out, run the pipeline on Hassan's laptop. Live Cairo AQ stays on Open-Meteo (`open-meteo-aq` feed); OpenAQ stays optional.
- **Files:**
  - `pipeline/earth_pipeline/geoscf.py` (**CREATE**): `index_for(lat, lon, when)`, `ascii_url(collection, var, t0, t1, lat_i, lon_i, stride)`, `parse_ascii(text) -> list[float|None]` (masks 1e15), `vmr_to_ugm3(vmr, mw)`, `region_annual_means(...)`.
  - `pipeline/earth_pipeline/fetch.py`: add `air_quality` to `URLS` (collection URL, no key).
  - `pipeline/earth_pipeline/build.py`: `--layer air_quality` builder; prints proposed range (p5–p95) and bytes vs budget.
  - `pipeline/tests/fixtures/recorded/geos-cf-co-2024-07-01.json` (**CREATE**): copy of `research-intake/Earth_Listens_Team_Package/Dataset/validated_co_sample.json` with URL, date, coordinates, layer note.
  - `pipeline/tests/test_geoscf.py` (**CREATE**).
  - `public/data/layers/air_quality.json` (**CREATE**, `sample: false`), `public/data/layers/air_quality.config.json` (range from the build output; unit stays µg/m³), `public/data/registry.json`.
  - `public/data/snapshots/geos-cf/latest.json` (**CREATE**): the Cairo hourly query result envelope (`status: "snapshot"`).
  - `public/data/explanations/all.json` via `pnpm data:explanations`: add the modeled/not-AQI caveats.
- **Acceptance:** fixture test returns exactly the five official values; a Cairo request URL built by `ascii_url` matches the index rules; `air_quality.json` validates, is `sample: false`, and every source has `retrieved` + `sha256` (sha256 of the raw ASCII responses, recorded in `pipeline/raw/manifest.json`); no 1e15 value reaches the JSON; the UI never shows "SAMPLE" for air quality and does show "Modeled".
- **Tests:** `test_geoscf.py` (parse, sentinel, index math for Cairo and the fixture point, conversion factors to 4 decimals, annual-mean weighting on a toy grid). Vitest: `air_quality.json` passes `LayerDataSchema`.
- **Perf budget:** `air_quality.json` ≤ 80 KB; snapshot ≤ 1.5 MB (or store daily means only if larger).

### A5 · Aerosols and lightning histories via GIBS — P0

- **Owner:** Hassan · **Branch:** `feat/data-gibs-aerosols-lightning` · **Estimate:** 2.5 h (requests run in the background)
- **Goal:** Replace `aerosols.sample.json` and `lightning.sample.json` with real regional series decoded from GIBS PNGs, as planned in addendum §4.2 and §5.
- **Aerosols:** GIBS `MERRA2_Aerosol_Optical_Depth_Analysis_Monthly` (1980-01 → 2026-08 per the addendum capabilities read). Frames: August of each year 1980–2025, 1024×512 PNG. Series per region = area-weighted mean of decoded AOD (`gibs.region_mean`). Species timbres (`timbreBySpecies`) unchanged.
- **Lightning:** `gibs.lightning_seasons()` already returns the 18 seasons (MAM 2017 → JJA 2021, 10-day windows). Sum `LIS_ISS_Flash_Count` days per window; record `n_days` actually available in each frame; missing days are never filled. Historical only (no live feed).
- **Rules:** PNG only; abort a frame if colormap hit rate < 0.99 (`gibs.decode_image`) and retry with WMTS tiles; `check_budget` must pass.
- **Files:**
  - `pipeline/earth_pipeline/build.py`: `--layer aerosols`, `--layer lightning` builders that use `pipeline/earth_pipeline/gibs.py` (`wms_url`, `parse_colormap`, `decode_image`, `region_mean`, `lightning_seasons`, `check_budget`, `sha256_file`).
  - `pipeline/tests/fixtures/recorded/merra2-aod-2024-08.png` and `lis-iss-flash-count-2020-07.png` (**CREATE**, copied from `/workspace/jukebox/samples/` where they were fetched on 13 Nov) plus their colormap XMLs.
  - `pipeline/tests/test_gibs.py`: decode tests for both fixtures.
  - `public/data/layers/aerosols.json`, `lightning.json` (**CREATE**), configs (ranges from p5–p95 output), `public/data/registry.json`.
  - `public/frames/aerosols/*.webp`, `public/frames/lightning/*.webp` (**CREATE**, previews ≤ 100 KB each at 1024×512); value PNGs and 2048×1024 versions go to `release-assets/` for A6.
  - `public/data/views/aerosols.view.json`, `lightning.view.json`: frame/ramp references.
- **Acceptance:** both files `sample: false`, validate, and carry retrieved + sha256 for each GIBS request (manifest); lightning frames list `n_days`; Lighthouse does not regress (frames are lazy).
- **Tests:** pytest decode hit rate = 1.0 on both fixtures; Vitest schema validation; quiz truth re-computed (`pnpm data:quiz`) if aerosol pairs are used.
- **Perf budget:** in-repo frames ≤ 100 KB each (1024×512); total new in-repo bytes ≤ 6 MB; anything larger goes to R2.

### A6 · R2: create release `data-v1`, upload, verify loading — P0 (custom domain P1)

- **Owner:** Hassan · **Branch:** `chore/assets-data-v1` (manifest and CSP changes only; the upload itself is an ops step) · **Estimate:** 1.5 h
- **Prerequisites (Hassan, by hand):** create an **R2 API token with Object Read & Write** scoped to bucket `earth-listens-assets`; put `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` into GitHub Actions secrets (and a local shell only when running the script). Never paste them into a doc or a PR.
- **Steps:**
  1. Build the release folder (`release-assets/`, git-ignored): 4K base textures (KTX2 if `toktx` is installed, otherwise 4K WebP entries with `tier: "4k"`), A5 value PNGs, and later the B2/B3 media.
  2. `gh release create data-v1 --title "Earth Listens data v1" --notes "Derived textures and frames."` then `gh release upload data-v1 release-assets/*` (needs Hassan's OK; it publishes).
  3. Mirror: dispatch the **sync-r2** workflow (`.github/workflows/sync-r2.yml`, input `tag=data-v1`) **or** run `node scripts/upload-r2.mjs --dir release-assets` (dry run), then `--yes`.
  4. Update `public/data/assets.manifest.json` with `{name, path, url, bytes, sha256, tier, role}` for each uploaded file.
  5. Verify: `curl -sI <public URL>/<file>` returns 200, `Cache-Control: public, max-age=31536000, immutable`, and `Access-Control-Allow-Origin` for the Vercel preview origin; then load `/en/listen` with Settings → Texture quality → 4K and confirm the 4K request succeeds and the size/hash check passes.
- **Custom domain (P1, recommended over r2.dev):** Cloudflare positions `r2.dev` for development and rate-limits it. Attach a custom domain to the bucket, then update **three** places together: `NEXT_PUBLIC_ASSET_BASE_URL` in Vercel, `DEFAULT_ASSET_BASE` in `src/core/assets.ts`, and `DATA_HOSTS` in `src/core/csp.ts` (the CSP hard-codes the r2.dev host today, so a new host would be blocked without this edit).
- **Files:** `public/data/assets.manifest.json`; for the custom domain also `src/core/assets.ts`, `src/core/csp.ts`, `README.md`.
- **Acceptance:** at least the 4K day/night/relief textures load from R2 on the preview; with `NEXT_PUBLIC_ASSET_BASE_URL=off` the app stays on the committed 2K files; a forced bad hash falls back to 2K (existing loader behaviour).
- **Tests:** `src/modules/data/integration.test.ts`: every manifest entry has bytes + sha256 + tier; `src/core/csp.ts` test (in D0's `src/core/csp.test.ts`) includes the asset host.
- **Perf budget:** 4K view upgrade ≤ 6 MB; 8K only on strong desktops (≤ +12 MB), after 4K is interactive.
- **Follow-up (P2):** `.github/workflows/snapshot.yml` today only uploads snapshots as a 7-day artifact. If R2 should hold the last good snapshot, add an `aws s3 sync public/data/snapshots s3://$R2_BUCKET/snapshots/` step using the same secrets as `sync-r2.yml`.

### A7 · Vercel preview deploy check (live, snapshot, demo; phone and laptop) — P0

- **Owner:** Hassan (Youssef on a phone) · **Branch:** none (preview of the A6 PR or of `develop`) · **Estimate:** 45 min
- **Vercel env (Preview + Production):** required `GROQ_API_KEY`, `FIRMS_MAP_KEY`, `CRON_SECRET`; recommended `GEMINI_API_KEY`, `OPENAQ_API_KEY`; optional `OPENROUTER_API_KEY`, `NEXT_PUBLIC_ASSET_BASE_URL`.
- **Checklist (record results in the PR or `docs/validation/perf.md`):**
  - Live: `/en/listen` freshness chip says "Live …" for at least GISTEMP/GML/Open-Meteo; `/api/health` 200.
  - Snapshot: block `/api/live/*` in DevTools → "Cached snapshot".
  - Demo: `/en/listen?demo=1`, then offline → plays.
  - Agent: an unmatched command goes to `/api/agent` and returns a tool call (Groq). With Groq removed, the mock parser still works.
  - Cron: `GET /api/cron/snapshot` without `Authorization: Bearer …` → 401.
  - Devices: Android/iPhone (Chrome/Safari) and a laptop: intro, Listen, Tutorial, Quiz, `/ar` RTL.
  - Security headers: CSP present; no request to a CDN; no key in any client chunk (`grep` the built `.next/static` for each secret **name** used server-side; values are never searched for in logs).
- **Acceptance:** every line checked on both devices, no console errors, a11y spot-check with VoiceOver/TalkBack on Listen.

### A8 · Release: `develop` → `main` with a merge commit, tag `v0.2-data` — P0

- **Owner:** Hassan · **Branch:** PR `develop` → `main` · **Estimate:** 20 min
- **Why now:** `main` (`7950683`) predates the CI fix, so its `web` job fails and `e2e`/`lighthouse` are skipped. Merging `develop` brings `allowBuilds` and the setup-node fix.
- **Steps:** open the PR, wait for all four checks green, merge with **"Create a merge commit"**, then:
  `git switch main && git pull && git tag -a v0.2-data -m "Data integration checkpoint" && git push origin v0.2-data`.
- **Acceptance:** `main` checks green (web, e2e, lighthouse, pipeline); Vercel production build from `main` succeeds; tag visible on GitHub. No force-push.
- **Note:** the v3 plan mentions a `v0.1-base` tag; the repo only has `base-phase-a`. Don't create `v0.1-base` retroactively unless Hassan wants it.

---

## 4. Phase B: new research sources (from `RESEARCH_REVIEW.md`)

Adopt-now list (review §9): credits and source list → compact stills → compact clips → 4960 captions → OPeNDAP fixture + adapter (done in A4) → 5552 texture. Media hosting: R2 (files over a few hundred KB never go into git). `svs.gsfc.nasa.gov` downloads timed out from the build box (DNS resolves it to 198.18.0.1 there), so the downloads run on Hassan's laptop.

**Decision needed (Hassan + Zain):** the addendum mapped SVS media into the 6 intro chapters, but Zain's 8-scene storyboard (`visuals/INTRO_STORYBOARD.md`) uses no SVS footage. Recommendation: keep the 8 scenes fully 3D, and show SVS media as "Real NASA view" cards (a) on S5 "Orchestra of layers" (one card per instrument/layer) and (b) in the Listen layer info drawer and on `/data`. That keeps the review's "no autoplay, lazy, reduced-motion still" rules and does not fight Theatre.

### B1 · Sources, credits and caveats — P0

- **Owner:** Hassan (Basmala verifies wording) · **Branch:** `docs/sources-research-v4` · **Estimate:** 1 h
- **Goal:** Every SVS id and document we use is in `public/data/sources.json` and `ATTRIBUTION.md`, with "key: none" where true. The `/data` page renders `sources.json` at runtime (`src/components/info-pages.tsx`), so new entries appear automatically.
- **Add to `public/data/sources.json` (missing today):** `svs-14439`, `svs-5153`, `svs-5151`, `svs-5152`, `svs-5154`, `svs-5572` (with `doi: 10.5281/zenodo.16782523`), `svs-5552`, `svs-5518` (adopt later, listed for completeness), `geos-cf-opendap` (collection URL `https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/assim/`), `gmao-knowland-1446` (`https://gmao.gsfc.nasa.gov/pubs/docs/Knowland1446.pdf`), `gmao-lucchesi-1203` (`https://gmao.gsfc.nasa.gov/pubs/docs/Lucchesi1203.pdf`), `gmao-geos-cf` (`https://gmao.gsfc.nasa.gov/gmao-products/geos-cf/`). Add `svs-5113` only if a fire still is used (it is cited in `ATTRIBUTION.md` already). Already present: 5533, 5196, 4960, 5425, 5669, 3912, 5011, 4950, 5313, 5475, 13786. Fill `check` with what was actually verified ("SVS API live 2026-11-13" etc.); no invented checks.
- **Citations to add (`ATTRIBUTION.md`, `docs/RESEARCH.md`):**
  - Knowland, K. E., et al.: _File Specification for GEOS-CF Products_, GMAO Office Note No. 17 (Version 1.3), 12 December 2022.
  - Lucchesi, R.: _File Specification for GEOS FP_, GMAO Office Note No. 4 (Version 1.2), 11 July 2018.
  - SVS 5572 GEOS Aerosols, DOI 10.5281/zenodo.16782523.
  - Official credit lines from review §4 for 14439 (producer Katie Jepson; visualizer Joseph V. Ardizzone; technical support Aaron E. Lepsch), 5153 (NASA GMAO; visualizer Joseph V. Ardizzone), 5533, 5196, 4960, 5425, 5572/5669/5552.
  - Keep "Uses NASA data; not endorsed by NASA." Keep `[citation needed: Basmala]` on GISTEMP, NOAA GML and NSIDC until Basmala verifies them.
- **Fix wrong text found in v4 review:** `ATTRIBUTION.md` and `README.md` still say `public/textures/earth-day.jpg` is a procedural stand-in. `public/textures/SOURCE.txt` and PR #3 show it is GIBS Blue Marble NG. Correct both.
- **Caveats** (air-quality explanation, `/data`, `messages/en.json` + `messages/ar.json` if UI strings): modeled vs station; historical vs live; layer 72 is a model index; `1e15` is missing, never zero; SVS 5533/14439/5153 are contextual, not synchronized to a point sample; GEOS-CF/GEOS-FP visuals are modeled, not AQI.
- **Files:** `public/data/sources.json`, `ATTRIBUTION.md`, `README.md`, `docs/RESEARCH.md`, `public/data/explanations/all.json` (regenerated), `messages/en.json`, `messages/ar.json`, `src/modules/data/sources.test.ts` (**CREATE**).
- **Acceptance:** each id above present exactly once with `url`, `license`, `key`, `usedFor`; `/data` lists them; `src/modules/messages.test.ts` (EN/AR key parity) green.
- **Tests:** `sources.test.ts`: ids unique; required ids present; every `svs-*` URL matches `https://svs.gsfc.nasa.gov/<id>/`.

### B2 · Media pipeline and compact stills — P1

- **Owner:** Hassan (pipeline, R2), Zain/Youssef (placement) · **Branch:** `feat/media-svs-stills` · **Estimate:** 2 h
- **Stills (all user-visible with credit; hosted on R2 if > ~300 KB):**
  - SVS 5533 `AirQuality_WithLabels_1920x1080_0000.png` (official ~2.2 MB; ship a pipeline-made, credited WebP).
  - SVS 14439 `CO.00040_print.jpg` (~173 KB, 1024×512) and the SVS 5153 CO print still (180.4 KB) + colour bar (4–8 KB); 5151 PM2.5, 5152 O₃, 5154 NOₓ print stills.
  - SVS 5572 `Aerosols_EarthRotating_1920x1080.png` (1.5 MB) + `Aerosols_cbar.png` (0.04 MB); SVS 5669 1920×1080 still.
- **Files:**
  - `pipeline/earth_pipeline/svs.py`: add `api(id)` (caches `pipeline/raw/svs/{id}.json`), `media(meta, name_like, min_w)`, `download(url, max_bytes=8_000_000)` reusing `refuse_large`; record each file in `pipeline/raw/manifest.json` (url, retrieved, sha256, bytes, source_id).
  - `pipeline/earth_pipeline/media.py` (**CREATE**): `--item 5533 --file ... --webp q=82` → `release-assets/media/…`; appends `role: "svs-media"` entries to `public/data/assets.manifest.json`.
  - `src/components/nasa-media-card.tsx` (**CREATE**, Youssef owns the component, Zain styles it): still with `<figure>` + `<figcaption>` credit; no autoplay; `loading="lazy"`.
  - `src/components/jukebox.tsx` (layer info drawer) and `src/components/info-pages.tsx` (`/data`): place the cards.
  - `pipeline/tests/test_pipeline.py`: `refuse_large` and manifest-entry tests.
- **Acceptance:** every card shows the official credit and links to the SVS page; under reduced motion only stills appear; nothing over 8 MB downloads automatically; no request to `svs.gsfc.nasa.gov` from the browser.
- **Perf budget:** nothing fetched on `/listen` or `/tutorial` until a card is opened; each WebP ≤ 400 KB.

### B3 · Compact clips and captions — P1

- **Owner:** Hassan (encode/upload), Nesma (choose excerpt timing), Zain (placement) · **Branch:** `feat/media-svs-clips` · **Estimate:** 2 h
- **Clips (user-started, captioned or described, lazy):**
  - SVS 14439 `CO.webm` (3.5 MB, 2048×1024). PM2.5/Ozone/NO animations only if a measured file is ≤ 8 MB (their sizes are unverified).
  - SVS 5196 1080p H.265 orbit mp4 (6.9 MB) re-encoded to WebM VP9 + MP4 H.264 fallback, each ≤ 8 MB, with the colour bar. Caption: "2020 DYAMOND model visualization; Mauna Loa remains the number source."
  - SVS 5425 silent 1080p beauty excerpt from `perpetual_ocean2_CLOSE_093_clean_noDate_1080p30.mp4`, ~25 s, `-an`, WebM ≤ 8 MB, official print still as the reduced-motion fallback. **Do not use SVS 14745** (licensed music).
  - SVS 4960 official English captions (`.vtt`, 6.3 KB) + a still now; a short ≤ 8 MB excerpt cut from the 68.6 MB HD WebM is **P2** (B4).
- **Files:** `pipeline/earth_pipeline/media.py` (ffmpeg encode recipes, size check), `public/data/assets.manifest.json`, `src/components/nasa-media-card.tsx` (video variant with `controls`, `preload="none"`, `<track kind="captions">` for 4960), `messages/en.json`, `messages/ar.json` (captions/descriptions).
- **Acceptance:** total intro/layer video ≤ 25 MB, each file ≤ 8 MB; every video has captions or a text description; no autoplay; `prefers-reduced-motion` shows the still only.
- **Tests:** Playwright: open a card on `/en/listen?demo=1`, assert the `<video>` has `preload="none"` and no media request happened before the click.

### B4 · 5552 equirect aerosol texture and the 4960 excerpt — P2

- **Owner:** Hassan · **Branch:** `feat/media-svs-extras` · **Estimate:** 1.5 h
- SVS 5552 `SOS_Aerosols_1024x512.png` (or 2048×1024) + transparent colour bar as the aerosols species overlay on the globe (`public/data/views/aerosols.view.json` overlay `kind: "baked"`, `src/components/earth-canvas.tsx`). Equirect movie only if a re-encode fits ≤ 8 MB.
- SVS 4960 ≤ 8 MB WebM excerpt with the official `.vtt`.
- **Acceptance:** aerosols view shows the species texture with the SVS credit line; Lighthouse unchanged on `/en/listen?demo=1` (texture loads only when the aerosols view is selected).

---

## 5. Phase C: missing data views (Hassan)

All C-PRs follow the A5 pattern: GIBS PNG + colormap → exact decode → value frames + previews; `sample: false` only with manifest entries; missing dates are labelled, never interpolated. Views go in `public/data/views/<id>.view.json` (**CREATE** where missing: `temperature`, `sea_ice`, `co2`, `wildfire`, `forest_height`, `precipitation`).

| ID  | Pri | Branch                                | What                                            | Source (no key unless stated)                                                                                                             | Files                                                                                                                                                                                                                                                                                                                         | Acceptance                                                                                            |
| --- | --- | ------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| C1  | P1  | `feat/data-merra2-temperature-frames` | Real temperature maps for Time Travel           | GIBS `MERRA2_2m_Air_Temperature_Monthly`, July every 5th year 1980–2025 (10 frames)                                                       | `pipeline/earth_pipeline/build.py`, `public/frames/temperature/*.webp` (replace SAMPLE set; 1880–1975 have no map), `public/data/layers/temperature.json` (frames), `public/data/views/temperature.view.json` (**CREATE**), `public/data/registry.json`                                                                       | Before 1980 the globe says "no map before 1980" while GISTEMP sound continues; frames validate        |
| C2  | P1  | `feat/data-amsr2-sea-ice-frames`      | Real sea-ice concentration frames               | GIBS `AMSRU2_Sea_Ice_Concentration_12km`, 15 Sep 2012–2024 (13); capabilities end 2025-09-01                                              | `public/frames/sea_ice/*.webp` (replace SAMPLE), `sea_ice.json`, `public/data/views/sea_ice.view.json` (**CREATE**), registry                                                                                                                                                                                                 | 2012↔2024 compare works; numbers stay NSIDC                                                           |
| C3  | P2  | `feat/layer-forest-height`            | New `forest_height` layer + canopy displacement | GIBS `GEDI_ISS_L3_Canopy_Height_Mean_RH100_201904-202303` (+4 cumulative windows)                                                         | `src/core/actions.ts` (`LAYER_IDS`), `public/data/layers/forest_height.config.json` + `.json` (**CREATE**), `public/data/views/forest_height.view.json` (**CREATE**), `src/modules/sonification/timbres.ts` (one new timbre id), `src/components/earth-canvas.tsx` (canopy exaggeration uniform, labelled), `messages/*.json` | Windows labelled "coverage growth", excluded from the quiz; score determinism test green              |
| C4  | P1  | `feat/live-eonet-markers`             | EONET event markers + earcons                   | Existing `eonet` feed (`src/server/feeds/run.ts`), snapshot `public/data/snapshots/eonet/latest.json`                                     | `src/components/earth-canvas.tsx` (instanced markers), `src/components/globe-stage.tsx` (DOM list of events for screen readers), `src/modules/sonification/earcons.ts`                                                                                                                                                        | Markers mirror a focusable DOM list; earcon ≤ 3 flashes/s; demo uses the snapshot                     |
| C5  | P2  | `feat/live-openaq-stations`           | Station dots next to the model                  | OpenAQ v3 (`OPENAQ_API_KEY`); `openaq` branch already in `src/server/feeds/run.ts`                                                        | `src/components/earth-canvas.tsx`, `src/components/globe-stage.tsx`, `public/data/snapshots/openaq/latest.json` (**CREATE**)                                                                                                                                                                                                  | Hidden when no key; "measured" label; Cairo station availability reported honestly (unverified today) |
| C6  | P1  | `feat/data-firms-regional-history`    | Real wildfire history for Africa/Egypt          | FIRMS Area API (`FIRMS_MAP_KEY`, obtained), ≤ 5 days per request; match the existing 12 frame dates 2025-07-01 … 2025-08-25 (5-day steps) | `pipeline/earth_pipeline/fetch.py` (template exists), `build.py`, `aggregate.py` (`bin_fires_5deg`), `public/data/layers/wildfire.json` (**CREATE**, with the FIRMS `ack`), `public/frames/wildfire/*.webp`, registry                                                                                                         | `source.ack` present (refinement requires it); key never in output, logs or errors                    |
| C7  | P2  | `feat/layer-precipitation`            | Optional precipitation layer                    | GIBS `IMERG_Precipitation_Rate` (daily to 2026-11-11 per addendum)                                                                        | `src/core/actions.ts`, `public/data/layers/precipitation.*` (**CREATE**), `public/data/views/precipitation.view.json` (**CREATE**), `timbres.ts`, `messages/*.json`                                                                                                                                                           | Pairs with the 4960 story; rain ticks capped                                                          |
| C8  | P2  | `feat/data-airs-co2-maps`             | CO₂ maps (visual only)                          | GIBS `AIRS_L3_Carbon_Dioxide_AIRS_AMSU_Monthly` 2002-09 → 2012-02                                                                         | `public/frames/co2/*.webp` (replace SAMPLE with Jan/Jul 2003–2011), `co2.json` frames, `public/data/views/co2.view.json` (**CREATE**)                                                                                                                                                                                         | Numbers stay Mauna Loa; map years outside 2002–2012 say "no map"                                      |

Tests for every C-PR: pytest decode hit rate on a recorded PNG fixture; Vitest schema validation; `pnpm data:quiz` when quiz pairs change. Perf budget: in-repo previews ≤ 100 KB each, value PNGs ≤ 300 KB (2048×1024) on R2, per-view switch ≤ 6 MB.

---

## 6. Phase D: visuals and Zain's track

Source: `visuals/Zain-Work-Guide.pdf` (36 pages) and `visuals/zain-guide-src/` (`build.py`, `index.html`, `starter-kit/`). Both starter-kit patches apply cleanly to `origin/develop` today (`git apply --check`).

### D0 · Deps PR + dev-only CSP (Hassan merges first) — P0

- **Owner:** Hassan · **Branch:** `chore/visuals-deps` · **Estimate:** 15 min
- **Files:**
  - `package.json`: apply `visuals/zain-guide-src/starter-kit/ASK-HASSAN-deps.patch` → dependencies `@svgdotjs/svg.js` 3.2.8, `@theatre/core` 0.7.2, `@theatre/r3f` 0.7.2; devDependency `@theatre/studio` 0.7.2.
  - `pnpm-lock.yaml`: regenerate with `pnpm install` (the patch does not include the lockfile). CI uses `--frozen-lockfile`, so the lockfile must be committed.
  - `pnpm-workspace.yaml`: only if `pnpm install` reports ignored builds, add the package to `allowBuilds`.
  - `src/core/csp.ts`: apply `ASK-HASSAN-dev-csp.patch` (adds `'unsafe-eval'` to `script-src` only when `NODE_ENV === 'development'`, for Theatre Studio).
  - `src/core/csp.test.ts` (**CREATE**): production policy has no `'unsafe-eval'`; development policy has it; demo policy has no model or data hosts.
- **Acceptance:** CI green; `pnpm build` route table shows no first-load growth (nothing imports the new packages yet); `grep -rl theatrejs-studio-root .next/static` finds nothing.

### D1–D13 · Zain's tasks (T1–T13) and Hassan's hooks

| ID  | Guide task                                                                                                                                                                   | Pri | Owner                               | Branch                | Files (CREATE unless noted)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Acceptance (from the guide's Definition of Done)                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ----------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | T1 Setup: `/lab` sandbox, Theatre project + seed state, Basis transcoder                                                                                                     | P0  | Zain                                | `feat/visuals-lab`    | `src/app/[locale]/lab/page.tsx`, `src/app/[locale]/lab/lab-client.tsx`, `src/modules/intro/theatre/project.ts`, `src/modules/intro/theatre/studio-dev.tsx`, `src/modules/intro/theatre/intro.state.json`, `public/basis/basis_transcoder.{js,wasm}` (copied from `node_modules/three/examples/jsm/libs/basis/`)                                                                                                                                                                                                          | `/en/lab` is 404 in production; Studio opens with `?studio=1` in dev only; no Studio code in `.next/static`                                                                                                                                                       |
| D2  | T2 Design tokens                                                                                                                                                             | P0  | Zain (Youssef reviews)              | `feat/visuals-tokens` | `src/styles/globals.css` (existing): add `--color-space-800`, `--color-gold`, `--color-gold-hi`, `--ease-out`, `--dur-1…4`; keep `--color-muted: #c5d0ea` unless contrast is re-checked                                                                                                                                                                                                                                                                                                                                  | Lighthouse a11y 1.00 on all URLs                                                                                                                                                                                                                                  |
| D3  | T3 svg.js logo, 4 states + static/favicon                                                                                                                                    | P0  | Zain                                | `feat/visuals-logo`   | `src/components/icons/logo.ts`; mount in `src/components/shell.tsx` (existing, tell Youssef); favicon variant in `src/app/icon.svg` (existing)                                                                                                                                                                                                                                                                                                                                                                           | < 2 KB path data, no layout shift, readable at 16 px, timelines stop on Pause and hidden tab; svg.js chunk lazy (guide measured ~29 KB gzip)                                                                                                                      |
| D4  | T4 + T5 Intro 3D scene + Theatre sequence (8 scenes, 100 s), GSAP/Lenis scrub, 8-chapter DOM, reduced-motion snaps                                                           | P0  | Zain (Nesma copy, Hassan narration) | `feat/visuals-intro`  | `src/modules/intro/index.ts`, `intro-scene.tsx`, `use-intro-scroll.ts`, `materials/atmosphere.ts`, `materials/data-glow.ts` (starter kit); existing files: `src/components/home-experience.tsx` (`CHAPTERS` 6 → 8, the `chapter === 5` CTA check → `chapter === 7`), `messages/en.json` + `messages/ar.json` (new chapter keys), `src/modules/narration/script.ts`, `public/audio/narration/manifest.json` (new line ids), **`tests/e2e/earth.spec.ts`** ("keyboard intro reaches listen": loop `step < 5` → `step < 7`) | Theatre object names match the contract; ≤ 300 keys; Esc → S8 with focus on "Start listening"; `html[data-gsap-disabled]` under reduced motion; `/en` and `/ar` Lighthouse ≥ 0.85 perf, 1.00 a11y; Theatre chunk lazy (guide measured ~83 KB gzip for core + r3f) |
| D5  | T6 P0 models: oud, kamanja, ney, darbuka, headphones, 2 satellites, Cairo marker                                                                                             | P0  | Zain                                | `feat/visuals-models` | `public/models/el_*_v01.glb`, `src/modules/intro/models/use-model.ts` (starter kit) + one `.tsx` per model, `docs/MODELS.md`                                                                                                                                                                                                                                                                                                                                                                                             | meshopt + KTX2, per-model GLB targets (oud ≤ 250 KB … Cairo ≤ 40 KB), landing GLB total ≤ 3 MB; `_lod1` for > 3k triangles; no CDN requests (Draco off)                                                                                                           |
| D6  | T7 Sada: model, Mixamo rig, clips, real-time layer                                                                                                                           | P0  | Zain                                | `feat/visuals-sada`   | `public/models/el_char_sada_v01.glb`, `src/modules/intro/sada.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 8–12k triangles, ≤ 65 bones, ≤ 1.2 MB with clips; idle/talk/point/listen/nod/shake/wave present; 0.35 s crossfades; reduced motion holds key poses; fallback: svg.js 2D Sada with 3 poses                                                                         |
| D7  | T8 Globe polish on `/listen`                                                                                                                                                 | P0  | Zain                                | `feat/visuals-globe`  | `src/components/earth-canvas.tsx`, `src/components/globe-stage.tsx` (existing; keep store reads and props)                                                                                                                                                                                                                                                                                                                                                                                                               | data glow follows the playhead, Cairo marker, jukebox ring, 3D focus ring mirrors DOM focus; `?globe=gl` and the no-WebGL poster still work; `/en/listen?demo=1` Lighthouse not lower than after A2                                                               |
| D8  | T9 UI screens (Figma → Youssef)                                                                                                                                              | P0  | Zain + Youssef                      | `feat/visuals-ui`     | `src/components/jukebox.tsx`, `tutorial-panel.tsx`, `quiz-panel.tsx`, `info-pages.tsx` (existing; Youssef edits), Sada placements                                                                                                                                                                                                                                                                                                                                                                                        | 1440/1024/390 + RTL; contrast checked; focus order annotated                                                                                                                                                                                                      |
| D9  | T10 Polish: curves, lights, transitions, high contrast, perf tiers, Lighthouse pass                                                                                          | P0  | Zain                                | same branches         | as above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | high contrast: no bloom/grain/nebula; ≤ 3 flashes/s; tiers per guide §6.3                                                                                                                                                                                         |
| D10 | T11 P1 models: riq, qanun, glass chimes, singing bowl; `ACT_conduct`; stage disc; sparks; ear spiral                                                                         | P1  | Zain                                | `feat/visuals-models` | `public/models/…`, `src/modules/intro/models/…`                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | same model DoD                                                                                                                                                                                                                                                    |
| D11 | T12 P2 extras: music-box hero, 3D layer icons, OG image, `ACT_dance_small`, depth of field                                                                                   | P2  | Zain                                | `feat/visuals-extras` | `public/models/el_hero_musicbox_v01.glb`, …                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | only if ahead                                                                                                                                                                                                                                                     |
| D12 | T13 Freeze: bug fixes, a11y pass with Youssef, demo-video shots for Nesma                                                                                                    | P0  | Zain + Youssef                      | `fix/visuals-*`       | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | keyboard-only and screen-reader pass; shots exported                                                                                                                                                                                                              |
| D13 | Hassan's hooks for Zain (guide §8): per-layer audio level/beat, guide agent "speaking" state for Sada `ACT_talk`, data hot-spots for notes and glow, quiz right/wrong events | P1  | Hassan                              | `feat/visual-hooks`   | `src/modules/sonification/index.ts` (export `useLayerLevel(layerId)`), `src/modules/agent/index.ts` (speaking state), `src/modules/data/index.ts` (hot-spot hook), `src/core/store.ts` (`visual` already has `level`, `pulse`, `layerId`, `playheadLon`)                                                                                                                                                                                                                                                                 | each hook has a demo-mode fake; Zain never edits store/data/sonification/agent modules                                                                                                                                                                            |

**Timing conflict to resolve:** the guide plans T1–T13 over H0–H48 (42 h of P0 work + 2 h sleep + 2 h freeze). If the submission deadline is on 14 November, there are not 48 hours left. Recommended compression (guide §2 "if we are behind"): keep T1–T5, T8, T10, T13; keep the mockup's procedural stand-ins for the instruments (same Theatre keys); use the svg.js 2D Sada if the rig fights back.

---

## 7. Phase E: wrap-up

| ID  | Pri                  | Owner                         | Branch                    | Task                                                                                   | Files                                                                                                                                                                                    | Acceptance                                                                                                                                                                                                            |
| --- | -------------------- | ----------------------------- | ------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | P1                   | Nesma (voice), Hassan (merge) | `content/narration-mp3`   | Record EN + Egyptian Arabic narration MP3s (22 lines × 2 locales, plus D4's new lines) | `public/audio/narration/en/*.mp3`, `public/audio/narration/ar/*.mp3` (**CREATE**), `public/audio/narration/manifest.json` (`status: "recorded"`, `sample: false` only when all are real) | each file ≤ 150 KB (mono 64 kbps); captions match the text; TTS fallback still works for missing lines                                                                                                                |
| E2  | P0                   | Basmala                       | `docs/citations-check`    | Citations and `/data` sources page check                                               | `public/data/sources.json`, `ATTRIBUTION.md`, `docs/RESEARCH.md`, `README.md`                                                                                                            | every source used is listed once; `[citation needed: Basmala]` resolved or kept honestly; FIRMS sentence verbatim; no invented DOI                                                                                    |
| E3  | P1                   | Youssef (Nesma picks shots)   | `docs/readme-screenshots` | Replace the README placeholder with real screenshots (Listen, intro, `/ar`)            | `README.md`, `docs/screenshots/*.webp` (**CREATE**, ≤ 300 KB each), delete `docs/screenshot-placeholder.svg`                                                                             | alt text on every image; README branch table updated to the v4 workflow                                                                                                                                               |
| E4  | P0                   | Youssef + Zain + Hassan       | `fix/final-qa`            | Final QA: a11y 1.00, Lighthouse, keyboard-only, NVDA/VoiceOver, phone + laptop         | `docs/validation/perf.md`, `docs/ACCESSIBILITY.md`                                                                                                                                       | Lighthouse a11y 1.00 on all six URLs; perf ≥ 0.85 on Listen and Tutorial; Playwright green; no serious/critical axe issues                                                                                            |
| E5  | P0                   | Nesma + Hassan                | `docs/demo-script`        | 3-minute demo script and backup plan                                                   | `docs/STORY.md` (existing) or `docs/DEMO_SCRIPT.md` (**CREATE**)                                                                                                                         | covers `?demo=1` offline fallback, which numbers are real vs modeled, and the narration lines                                                                                                                         |
| E6  | P0 (after the event) | Hassan                        | none                      | Rotate every key that was pasted in chat                                               | Vercel env, GitHub secrets, `.env.local`                                                                                                                                                 | new values for `FIRMS_MAP_KEY`, the Cloudflare API token, the R2 access key pair, `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `OPENAQ_API_KEY`, `CRON_SECRET` (whichever were shared); old values revoked |

---

## 8. Secrets (names only)

| Where                      | Required                                                                                  | Recommended                        | Optional                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Vercel** (server env)    | `GROQ_API_KEY`, `FIRMS_MAP_KEY`, `CRON_SECRET`                                            | `GEMINI_API_KEY`, `OPENAQ_API_KEY` | `OPENROUTER_API_KEY`, `NEXT_PUBLIC_ASSET_BASE_URL` (unset = r2.dev public URL; `off` = same-origin 2K files) |
| **GitHub Actions secrets** | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `FIRMS_MAP_KEY` |                                    | `OPENAQ_API_KEY`                                                                                             |

- **Unused:** `NASA_API_KEY`, `EARTHDATA_TOKEN` (stay blank in `.env.example`; nothing reads them). `REVALIDATE_SECRET` is removed in A1.
- **Still to do (Hassan):** create the R2 access key (Object Read & Write, scoped to `earth-listens-assets`).
- **Not repo variables:** the Cloudflare API token in Hassan's local secrets file is for Hassan's own tooling; it is not read by the app and must never be added to `.env.example`, Vercel or the repo.
- **No new credentials** are needed for GEOS-CF OPeNDAP, NASA SVS, the GMAO PDFs or GIBS.
- `NEXT_PUBLIC_` is only for the public asset URL. Never put a key behind it.

---

## 9. Git workflow

- Feature branches off a fresh `origin/develop`, one per PR in this document.
- **Squash-merge** feature PRs into `develop`. **Merge commit** for `develop` → `main`. Tags on `main`: `v0.2-data` (A8), `v1.0-final` (after E4).
- No force-push. No rewriting pushed history. No direct commits to `develop` or `main`.
- **Hassan approves and merges every PR.**
- Zain's folders and rules: guide §7 (`src/modules/intro/**`, `public/models/**`, `src/components/icons/**` are his; data, server, pipeline, env, CI and config are Hassan's). Don't reuse the old `feat/globe-3d` / `feat/intro-landing` branches; they predate PR #3.
- Sync after pushing with `git merge origin/develop`, never a rebase of a pushed branch.

---

## 10. Proposed timeline (Cairo time, UTC+2)

H0 = Fri 13 Nov 15:30. Clock targets are proposals; the freeze must move to "deadline − 4 h" once Space Apps Cairo confirms the deadline.

| When                            | Hassan                                         | Zain                                           | Youssef                       | Nesma                   | Basmala                            |
| ------------------------------- | ---------------------------------------------- | ---------------------------------------------- | ----------------------------- | ----------------------- | ---------------------------------- |
| Fri 15:30–16:00                 | D0 deps + CSP, A1                              | read guide, branch `feat/visuals-lab` after D0 | review D2 tokens plan         | D4 chapter copy (EN/AR) | B1 credit wording                  |
| Fri 16:00–19:00                 | A2 perf, A3 histories                          | D1 lab, D2 tokens, D3 logo                     | B2 card component skeleton    | shot list               | verify GISTEMP/GML/NSIDC citations |
| Fri 19:00–22:00                 | A4 GEOS-CF, A5 GIBS (background)               | D4 intro scene + sequence                      | perf-budget test review, a11y | narration script final  | B1 review                          |
| Fri 22:00–Sat 00:30             | B1 merge, A6 R2, A7 preview check              | D4 continues                                   | A7 phone check                | record narration (E1)   | E2 sources check                   |
| Sat 00:30–01:00                 | **A8 → `main`, tag `v0.2-data`**               | —                                              | —                             | —                       | —                                  |
| Sat 01:00–08:00                 | B2/B3 media, C1/C2/C4/C6 (P1), sleep in shifts | D5 models (or stand-ins), sleep                | D8 screens                    | E1 recording            | quiz clip check                    |
| Sat 08:00–14:00                 | D13 hooks, merges, C P1 leftovers              | D6 Sada (or 2D fallback), D7 globe polish, D9  | D8, E3 screenshots            | demo video rough cut    | Impact numbers                     |
| **Sat 14:00 (proposed freeze)** | bug fixes only                                 | D12 freeze                                     | E4 final QA                   | E5 demo script          | proofread                          |
| Sat 14:00–deadline              | E4, release `v1.0-final`                       | D12                                            | E4                            | final video             | submission text                    |
| After the event                 | **E6 key rotation**                            | handoff checklist                              |                               |                         |                                    |

---

## 11. Inconsistencies found while preparing v4

1. Lighthouse numbers differ between sources: `docs/validation/perf.md` shows Listen/Tutorial 0.84/0.84 and Quiz 0.97; PR #3's CI run shows 0.80/0.81 and Quiz 0.94. Treat the CI numbers as current.
2. Bundle size: PR #3 says ~2.1 MB gzip (largest chunk 882 KB); the Zain guide says 2.21 MB; a local sum today gives 2.20 MB (different gzip settings). All are "all chunks", not first load.
3. `ATTRIBUTION.md` and `README.md` say the day texture is a procedural stand-in; `public/textures/SOURCE.txt` and PR #3 say it is GIBS Blue Marble NG (fix in B1).
4. Temperature, CO₂, sea ice, wildfire, SST and ocean-currents histories are also SAMPLE in the registry, not only aerosols/lightning/air quality. A3 covers the three with recorded CSVs; C6 covers wildfire.
5. `LayerDataSchema.series` requires all 8 regions (zod 4 exhaustive record), which blocks honest global-only files (A3 fixes it).
6. The CSP hard-codes the r2.dev host, so a custom domain also needs `src/core/csp.ts` (A6).
7. The addendum puts SVS media in the 6 intro chapters; Zain's 8-scene storyboard has no SVS footage (decision in Phase B).
8. The GEOS-CF `aqc` collection ends 2 Jan 2026, so the air-quality layer's current SAMPLE years (2024–2026) cannot all be real; real years are 2018–2025.
9. The v3 plan says `main` is a checkpoint for `v0.1-base`; no such tag exists (only `base-phase-a`).
10. Event timing differs across docs: `BUILD_BRIEF.md` and the EN/AR summaries say work starts Sat 14 Nov 09:00 and runs to Sun 15 Nov; the README and this brief say the event is 13–14 Nov. The Zain guide's 48-hour plan assumes the longer window. Hassan should confirm the official schedule and deadline.
11. Pack A's `NASA_Media_Not_Included.txt` says the 5533 videos are included; they are link-only (from the research review).
12. The deps patch does not include `pnpm-lock.yaml`; CI runs `--frozen-lockfile`, so D0 must commit a regenerated lockfile.
13. The v3 plans say the 3-hourly `snapshot` workflow publishes to R2 and triggers revalidation. `.github/workflows/snapshot.yml` actually only runs `scripts/snapshot.ts` and uploads `public/data/snapshots` as a 7-day Actions artifact: no R2 upload, no commit, no revalidation. The deployed fallback is therefore the snapshot bundled at build time. Optional A6 follow-up (P2): add an R2 upload step once the R2 secrets exist.
14. The v3 decision "CI fix rides on the data branch" is what happened (`56f2854` is the first commit of `feat/data-integration`, followed by `8bc8c3d`). The addendum's CI section still describes a separate `fix/ci-pnpm-builds` branch; v4 notes the correction.
