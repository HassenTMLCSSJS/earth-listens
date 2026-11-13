# Performance notes, 13 Nov 2026

Lighthouse CI (headless Chromium, one run, production `next start`) on this branch:

| URL                 | Performance | Accessibility |
| ------------------- | ----------- | ------------- |
| `/en`               | 0.96        | 1.00          |
| `/ar`               | 0.95        | 1.00          |
| `/en/listen?demo=1` | 0.84        | 1.00          |
| `/en/quiz`          | 0.97        | 1.00          |
| `/en/guide`         | 0.91        | 1.00          |
| `/en/tutorial`      | 0.84        | 1.00          |

Accessibility is 1.00 on every measured route. The gate in `lighthouserc.json` is an error below 1. Performance is a warning below 0.85. `/en/listen` and `/en/tutorial` scored 0.84 in this run, so they sit just under that warning. They still pass CI. The landing page is above 0.9.

Playwright: 25/25, including axe with no serious or critical violations, the offline `?demo=1` run, a demo run with external hosts blocked, and a live-feed failure that shows "Cached snapshot".

Vitest lines coverage 92%. Pipeline pytest 12 passed, including a 100% colormap hit on the recorded MUR SST PNG (76,301 opaque pixels).

## What the budgets mean here

- Committed textures are 2K WebP/JPEG/PNG. The day WebP is 181 KB. The ETOPO height PNG is 674 KB.
- 4K and 8K are not in the repo. `chooseTier` asks for 4K by default and 8K only on a strong desktop after 4K holds 55 fps. Until those files are in the manifest, the loader stays on the committed 2K set.
- The globe mesh is 128×64 while motion is on, and 64×32 when motion is reduced. DPR cap is 1.5.
- Tone notes are scheduled from the player, not from inside the shader. The shader only reads the playhead longitude.

## Hand check before the demo

The CI machine has a software GPU, so frame-time numbers here are smoke results. On a phone, a laptop, and a desktop, record p95 frame time, `renderer.info.memory`, and whether the 4K upgrade stays smooth for 3 seconds. Put the three rows under this file. The tier targets are in the data-integration addendum §10.1.
