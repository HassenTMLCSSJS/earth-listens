# A7 preview checklist

Filled 13 Nov 2026 from this environment. Phone and laptop passes, and a logged-in Vercel project, need Hassan.

| Check                                            | Result here                                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                                | Not run against a Vercel preview. Local route exists.                                                                  |
| Live freshness chip                              | Not checked on a preview. Bundled snapshots are in `public/data/snapshots/`.                                           |
| Block `/api/live/*` shows "Cached snapshot"      | Covered by Playwright `a failed live feed shows a cached snapshot` when the suite is run.                              |
| `/en/listen?demo=1` then offline plays           | Covered by Playwright `demo listen survives a blocked network` when the suite is run.                                  |
| Agent with no keys                               | Mock parser is the default when provider keys are unset.                                                               |
| `GET /api/cron/snapshot` without a bearer        | The route returns 401. Not called on Vercel from here.                                                                 |
| Phone and laptop, `/ar`                          | Not done. Needs a person.                                                                                              |
| CSP and no server key names in the client bundle | Re-check after `pnpm build` with `grep` for `FIRMS_MAP_KEY`, `OPENAQ_API_KEY`, `GROQ_API_KEY`, `R2_SECRET_ACCESS_KEY`. |
| OpenAQ                                           | `OPENAQ_API_KEY` is not set. Stations are empty on purpose.                                                            |
| FIRMS history                                    | `FIRMS_MAP_KEY` is not set. The wildfire series stays SAMPLE.                                                          |
| R2 4K/8K                                         | No R2 credentials in this environment. `scripts/upload-r2.mjs --dry-run` lists objects and uploads nothing.            |
| `develop` → `main`, tag `v0.3-data`              | Not done. Hassan merges and tags. See `docs/validation/release-v0.3.md`.                                               |
