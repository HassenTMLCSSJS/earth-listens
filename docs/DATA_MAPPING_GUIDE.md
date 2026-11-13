# Data mapping guide

Every number shipped in `public/data/**/*.sample.json` is synthetic. The filename ends in `.sample.json`, the JSON has `"sample": true`, and the page shows the SAMPLE banner. Do not copy a published NASA or NOAA value into a sample file.

Real data replaces the sample file. It does not change the sonification math.

The zod schemas live in `src/modules/data/schemas.ts`:

- `RegistrySchema` — `public/data/registry.json`
- `LayerConfigSchema` — `public/data/layers/<id>.config.json`
- `LayerDataSchema` — `public/data/layers/<id>.json` or `<id>.sample.json`
- `RegionsSchema` — `public/data/regions.json`
- `QuizFileSchema` — `public/data/quiz/clips.sample.json`

`pnpm data:schemas` writes the JSON Schema copies to `pipeline/earth_pipeline/schemas/`.

## The ten steps

1. **Fetch.** Set `FIRMS_MAP_KEY` in the environment for wildfire only. Run `python -m earth_pipeline.fetch --layer <id>` from `pipeline/`. Output goes to `pipeline/raw/` with `pipeline/raw/manifest.json` (URL, date, SHA-256). Start with `--dry-run`. The dry run prints the placeholder `{FIRMS_MAP_KEY}` and never the environment value. Do not point the web app at the FIRMS API.

   | id          | Source                                   | URL                                                                                                  |
   | ----------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
   | temperature | NASA GISS GISTEMP v4                     | `https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv`                                    |
   | co2         | NOAA GML Mauna Loa monthly               | `https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv`                                       |
   | sea_ice     | NSIDC Sea Ice Index G02135 v4, September | `https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_09_extent_v4.0.csv`                |
   | wildfire    | NASA FIRMS VIIRS 375 m area API          | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{W,S,E,N}/{1..5}/{YYYY-MM-DD}` |

2. **Clean and aggregate.** `python -m earth_pipeline.build --layer <id>` runs parse, then clean, then aggregate. Parsers: `parse_gistemp`, `parse_co2_mm`, `parse_nsidc_monthly`, `parse_firms_csv`. Missing markers become `None`. CO2 becomes annual means. Sea ice keeps September. FIRMS keeps VIIRS confidence `n` and `h`.

3. **Variable detection.** The build prints a proposed `range` and the robust percentiles. Edit `public/data/layers/<id>.config.json` (`variables.*.range` and `register`) after you review those numbers. Schema: `LayerConfigSchema`.

4. **Export.** The layer file is `public/data/layers/<id>.json` with `sample: false`, `retrieved`, and `sha256` filled in. Schema: `LayerDataSchema`. Wildfire with `sample: false` must have a non-empty `source.ack`.

5. **Registry.** Point `public/data/registry.json` at the new file instead of `<id>.sample.json`. Schema: `RegistrySchema`. The registry ids must equal `temperature`, `co2`, `sea_ice`, and `wildfire`.

6. **Check.** `pnpm data:validate && pnpm test`. If the score snapshot changes, update it on purpose with `pnpm exec vitest -u src/modules/sonification/score.test.ts` and say why in the pull request.

7. **Frames.** Put equirectangular WebP files at `public/frames/<id>/<t>.webp` and set `frames[]` in the layer JSON. The sample generator writes a frame every 5th year (and every 5th wildfire day) plus the last year, 2048×1024, each at most 200 KB, with a SAMPLE watermark.

8. **Validation.** `python -m earth_pipeline.validate` writes plots to `docs/validation/`. The file there today, `sample-check.svg`, is a SAMPLE self-check of the plotting code. It is not a NASA comparison. Replace it when a real frame series exists. The target Pearson r between frame-derived and CSV global means is at least 0.9.

9. **Quiz and explanations.** `pnpm data:quiz` recomputes `truth` with ordinary least squares. `pnpm data:explanations` rewrites `public/data/explanations/all.json` from the configs. Explanations are templates, not a language model.

10. **Narration.** Add MP3 files under `public/audio/narration/{en,ar}/` and set each slot’s status to `recorded` in `public/audio/narration/manifest.json`. Until then the status stays `missing` and the app speaks from the text in `src/modules/narration/script.ts`.

## Sample formulas

The generator is `scripts/generate-samples.ts`, seeded with `mulberry32(20261114)`.

- Temperature, 1880–2025: `v = -0.3 + 1.4·((t-1880)/145)^2.2 + 0.08·sin(t/3.7) + noise(σ 0.05)`. Africa is null for 1880–1900. The global 2024 value is forced to 1.85. Other values are clamped to `[-0.55, 1.35]`.
- CO2, monthly 1958–2025, then annual means: `v = 312 + 0.8·(t-1958) + 0.0125·(t-1958)^2 + 3·sin(2π·month/12)`.
- Sea ice, September 1979–2025: `v = 7.2 - 0.075·(t-1979) + noise(σ 0.25)`.
- Wildfire: 60 days from 2025-07-01, about 40 cells, plus an annual series 2012–2025.

Region boxes are in `public/data/regions.json`. Centres are latitude, then longitude. Egypt is `26.8, 30.8`.
