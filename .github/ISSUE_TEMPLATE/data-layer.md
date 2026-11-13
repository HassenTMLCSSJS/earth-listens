---
name: Data layer
about: Map a real dataset into a layer contract
title: 'data: '
labels: data
---

## Layer id

`temperature` | `co2` | `sea_ice` | `wildfire` | other (say why it is in scope)

## Source

- Dataset and URL:
- Retrieved on:
- Licence and the acknowledgement sentence:

## Mapping

- Variable, unit, and proposed `range`:
- `register` and timbre:
- Spatial or global:
- Frame paths under `public/frames/<id>/`:

## Checks

- [ ] `python -m earth_pipeline.fetch --layer <id>` wrote `pipeline/raw/` and `raw/manifest.json` (dry-run first).
- [ ] `public/data/layers/<id>.json` has `sample: false`, `retrieved`, and `sha256`.
- [ ] `public/data/registry.json` points at that file.
- [ ] `pnpm data:validate && pnpm test` pass, and any score-snapshot update is explained.
- [ ] `docs/validation/` contains the new plot.
- [ ] Quiz truths and explanations were regenerated.
