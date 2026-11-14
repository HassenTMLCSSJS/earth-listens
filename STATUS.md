# STATUS — Truth audit (Earth Listens)

| | |
|---|---|
| Branch | `docs/truth-audit`, from `origin/develop` @ `8fcd49c` |
| Method | `pnpm build` + `next start` on `http://localhost:3100`, played with Playwright in a fresh browser context (no login, no stored state). Vercel checked with anonymous `curl`. |
| Date | 2026-11-14 |
| App code changed | **none** — only this file |

## Blocker: the live deployment is gone

`https://earth-listens-seven.vercel.app` returns **404 on `/`, `/en`, `/ar`, `/en/listen`**
(the domain is the project's own, per `docs/3D Intro/Zain-Assets-Streaming-Guide.md`).
The deployed site could not be tested at all. Every result below is the local
production build of `develop`. **Do not submit the Vercel link until it is redeployed.**

## Feature status

| Feature | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Language gate | WORKS | 3 buttons (`Begin with sound…`, `English`, `عربي`); `عربي` → `/ar`, `html dir=rtl`, `lang=ar` | |
| Listening mode | PARTIAL | Mode chip toggles `Visual`→audio-first; header, captions and command box render | Microphone path returns 503 (no STT key), so the listening loop cannot complete |
| Intro — voices | WORKS | 9 `HTMLMediaElement.play()` calls during the intro, **all blob URLs from the preloaded MP3 set**; `speechSynthesis.speak` called **0** times | Recorded audio, not the robot voice |
| Intro — pacing | PARTIAL | All 7 lines (`intro.l1`…`l7`) finish in **~13 s** (l1 at 2.4 s, l7 at 12.5 s, hub at 13.5 s) | Spec schedules them to ~88 s; the whole story is compressed into 13 s |
| Intro — visuals | NOT WORKING | **0 `<canvas>`**, 0 `<svg>`; the only image is `/textures/earth-day.jpg`; the screen shows a text list (Oud, Kamanja, Ney…) plus captions | No 3D globe and no designed scene visuals |
| Hub + 4 cards | WORKS | `choice-hub` renders `1 Explore the Earth · 2 Quick tutorial · 3 How the sounds work · 4 Quiz` plus the symphony link | |
| Globe — 3D | WORKS | `/en/listen`: 1 `<canvas>`, `data-testid="globe"` | |
| Globe — drag | WORKS | Dragging across the canvas changes the rendered pixels (SHA-1 of the canvas changes) | |
| Globe — textures | WORKS | `earth-day.jpg` (GIBS Blue Marble) applies; Earth is visible | |
| Temperature | WORKS (real) | `temperature.json`: 46 frames, 0 sample, source GISTEMP | |
| Sea ice | WORKS (real) | 27 frames, 0 sample, NSIDC Sea Ice Index | |
| Carbon dioxide | WORKS (real) | 9 frames, 0 sample, NOAA GML | |
| Night lights | WORKS (real) | 2 frames, 0 sample, Black Marble | |
| Ocean (SST) | WORKS (real) | 34 frames, 0 sample, GHRSST MUR | |
| Aerosols | WORKS (real) | 57 frames, 0 sample, MERRA-2 | |
| Lightning | WORKS (real) | 18 frames, 0 sample, ISS LIS | |
| Forest height | WORKS (real) | 1 frame, 0 sample, GEDI | |
| Rainfall | WORKS (real) | 42 frames, 0 sample, GPM IMERG | |
| Natural events | WORKS (real) | 0 map frames; EONET markers, `/api/live/eonet` live, 5 open events | Points, not a time series |
| Air quality | DEMO DATA | `air_quality.json` has **0 frames**; only the live Open-Meteo/CAMS model is available | No historical series |
| Fire history | DEMO DATA | **Only `wildfire.sample.json`** (12 sample frames) | Banner shows `SAMPLE DATA` |
| Ocean currents | DEMO DATA | **Only `ocean_currents.sample.json`** (1 sample frame) | Banner shows `SAMPLE DATA` |
| View switching | PARTIAL | Clicking `Sea ice` sets its `aria-pressed=true` and the caption becomes `Temperature, Sea ice, Global, 1880`, but `[data-testid="layer-legend"]` **stays `Temperature`** and no `view.sea_ice` narration fires | Layers stack; the legend and narration do not follow the change |
| Year slider | WORKS | 3 sliders; ArrowRight moved the year 1880 → 1888 | |
| Sonification per view | PARTIAL | Tone.js **synths** (`PolySynth`, `FMSynth`, `Oscillator`) plus a generated crackle player; no sampled instruments | The claim "real instruments" is false; it is synthesis with an instrument name over it |
| Live feeds | PARTIAL | 6/7 fresh: nsidc 2026-09-15, noaa-gml 2026-09-01, eonet 2026-11-12, firms 2026-11-13, open-meteo 2026-11-14 10:45, open-meteo-aq 2026-11-14 10:00. **gistemp is `status:"snapshot"`, `dataTime:2025-01-01`, `latencyNote:"fetch failed"`** | Temperature's live number is a year-old cached snapshot |
| Symphony | PARTIAL | 1 canvas, `Play the Earth's story` starts; captions update | Playback quality/length not measured |
| Tutorial (7 steps) | NOT WORKING | Shows `Step 1 of 7`; **no Next/Back button** and the step never advances; the Explore panel is embedded inside it | Not a walkthrough |
| How it sounds | PARTIAL | Buttons: `Play lowest year`, `Play highest year`, `Replay the intro`; clicking updates the caption | No per-instrument "Hear it" |
| Quiz | PARTIAL | `Start` → `1 / 10` with `Play clip` and 3 answers; clicking `Increased` leaves `Score 0/0` | No visible feedback or score change |
| Guide | WORKS | 1935 chars, sources section, 1 GitHub link | |
| Settings — save + apply | WORKS | 6 switches (Interface sounds, Captions, Vibration, Hold Space, High contrast, Screen reader mode). Turning Captions off removes the caption strip immediately, survives reload, and is written to `el.settings.v1` | |
| AI agent — text EN | NOT WORKING | 5/5 commands (`play temperature`, `go to 1990`, `open settings`, `switch to Arabic`, `what am I hearing`) return `{"actions":[],"provider":"none"}` | No `GROQ_API_KEY`/`OPENROUTER_API_KEY` and no offline parser |
| AI agent — text AR | NOT WORKING | 5/5 Arabic commands return zero actions, `provider:"none"` | Same |
| AI agent — voice EN/AR | NOT WORKING | Pressing Talk sends `POST /api/stt` → **503** (`stt unavailable`, `GROQ_API_KEY` unset) | No transcript, so nothing to act on |
| Narration MP3 vs robotic | WORKS | 9 intro plays were preloaded MP3 blobs; **0** `speechSynthesis` calls | A fallback engine still exists in code and would speak robotically if a clip were missing |
| Captions | WORKS | `role="log"` strip updates with every line (`Every day, Earth experiences…`, `Where would you like to go?…`) | |
| Offline `?demo=1` | PARTIAL | `DEMO` banner and hub render; **0 canvases**; not tested with the network actually off | Demo mode removes the globe |
| Mobile 390 px | WORKS | `/en` and `/ar`: `scrollWidth = clientWidth = 390`, no overflow; mobile menu opens with 10 links | |
| Arabic RTL | WORKS | `/ar`: `dir=rtl`, `lang=ar`, Arabic copy and Egyptian colloquial lines | |
| Header links | WORKS | 6 links (`/en`, `/en/listen`, `/en/symphony`, `/en/data`, `/en/about`, `/en/settings`) all 200 | |
| Header buttons | WORKS | Learn (opens tutorial panel), EN (no-op on EN), ع (`/ar` + RTL), Visual (mode switch), Stop all sound, Menu (mobile drawer) | Menu is hidden ≥1024 px by design |
| Footer | WORKS | 13 links, all 200; "Not endorsed by NASA" and the GitHub link present | **Footer is not rendered on `/en/listen`** (docked pages omit it) |

## Compliance checklist

| # | Rule | Result | Evidence |
| --- | --- | --- | --- |
| 1 | No images/video/voices/likeness of anyone under 18 | **PASS** | No photographic people assets in `public/`; the only imagery is NASA GIBS Earth textures and UI icons. Absence in git history is not proven |
| 2 | Every AI-generated image/video has a visible "AI-generated" watermark | **PASS (N/A)** | No AI-generated images or video exist in the repo or `public/` |
| 3 | AI audio disclosed on About, README, and MP3 ID3 | **FAIL** | About page does credit "Voices: Chatterbox by Resemble AI (MIT, watermarked)". **README has no disclosure.** **0 of 24 sampled MP3s contain an `AI-generated voice (Chatterbox)` ID3 comment** (scanned first 4 KB) |
| 4 | Credits for every image, texture, model, music, text, dataset | **PARTIAL** | `ATTRIBUTION.md` is detailed and `/en/data` lists 51 external sources with names. **`CREDITS.md` does not exist** |
| 5 | No NASA logo/identity misuse; "not endorsed" present | **PASS** | No NASA logo or wordmark assets; `Uses NASA data. Not endorsed by NASA.` in the footer and on `/en/about` |
| 6 | Every external link opens in Incognito without login | **FAIL** | GitHub repo: 200. NASA SVS links: 200. **Vercel deployment: 404 on every route.** The Space Apps challenge URL could not be resolved from this network (`curl` returned no response) — unverified |

## Safe to claim in the demo/PDF

Only these:

- The language gate switches the whole site to RTL Egyptian Arabic.
- The hub offers the four destinations.
- Narration is **recorded audio**, not a robotic voice (verified: 9 MP3 plays, 0 browser-voice calls).
- The 3D globe renders with real NASA Blue Marble imagery and can be dragged.
- 10 of the 13 views are built on real source series (Temperature, Sea ice, CO₂, Night lights, Ocean SST, Aerosols, Lightning, Forest height, Rainfall, Natural events).
- The 6 live feeds that work return real values with a timestamp (sea ice, CO₂, EONET, FIRMS, Open-Meteo weather and air quality).
- The year slider changes the year.
- Captions display every spoken line.
- Settings save and apply immediately (captions off removes the strip and persists).
- No horizontal overflow at 390 px, in English or Arabic.
- Every header and footer link resolves.

Do **not** claim: the live Vercel URL; the AI agent (text or voice); a 3D or designed intro; the tutorial; per-instrument "Hear it"; "real instruments"; Fire history or Ocean currents as real data; a live temperature figure (it is a 2025 snapshot with a failed fetch); quiz scoring.

## Reproduce

```bash
pnpm build && npx next start -p 3100
# then the Playwright probes used above against localhost:3100
```
