# 3D Models

| Model     | URL                                                                         | Size    | Source    | License                                           |
| --------- | --------------------------------------------------------------------------- | ------- | --------- | ------------------------------------------------- |
| Guitar    | https://pub-f4844155e9804bb5adcb0c121896e82b.r2.dev/v1/models/guitar.glb    | 12.4 MB | R2 / Zain | Provided by Zain for this project; see CREDITS.md |
| Satellite | https://pub-f4844155e9804bb5adcb0c121896e82b.r2.dev/v1/models/satellite.glb | 11.4 MB | R2 / Zain | Provided by Zain for this project; see CREDITS.md |

Both are single-mesh, single-material GLBs with WebP textures (`EXT_texture_webp`, natively supported by three.js). No Draco or KTX2 compression. No animation clips — motion is applied in code (`useFrame`).

- Guitar: ~0.49w × 1.0h × 0.26d, upright on Y.
- Satellite: ~1.0w × 0.31h × 0.84d, flat on XZ.
- Scale start: `globeRadius * 0.25` (tuned in `src/modules/models/GlbModel.tsx` via `baseScale` prop, default 0.25).

Override the host with `NEXT_PUBLIC_ASSET_BASE_URL` (see `.env.example`). CSP already allows the R2 host in `connect-src` and `img-src`/`media-src` (see `src/core/csp.ts`).
