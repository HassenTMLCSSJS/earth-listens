# STATUS — Truth audit (Earth Listens)

| | |
|---|---|
| Branch | `docs/truth-audit`, from `origin/develop` @ `8fcd49c` |
| Method | `pnpm build` + `pnpm start` on `http://localhost:3100`, driven with Playwright (fresh browser context = no login, no stored state) |
| Date | 2026-11-14 |
| App code changed | **none** — only this report |

## Blocker: the live Vercel URL is dead

`https://earth-listens-seven.vercel.app` returns **404 on `/`, `/en`, `/ar`, and `/en/listen`**.
Nothing could be tested on the deployed site, so every result below is from the local
production build of `develop`. Do not put the Vercel link in the submission until it is
redeployed and re-checked.

## Feature status

Status meanings: **WORKS** = tested and does what it claims · **PARTIAL** = works with limits
(stated) · **DEMO DATA** = works but on sample data · **NOT WORKING / DESIGN ONLY**.

| Feature | Status | Evidence (observed) | Notes |
| --- | --- | --- | --- |
| Language gate | WORKS | 2 option buttons render (`data-preferred`); clicking `عربي` navigates to `/ar`, `html[lang]=ar`, `dir=rtl` | |
| Listening mode | PARTIAL | Mode toggle present in header (`Visual` chip); gallery/commands render | Microphone/STT not exercisable headlessly; no live-voice path verified |
| Intro — voices | WORKS | 5 distinct `/audio/narration/ar/*.mp3` requests fired during the intro; 0 console errors | Recorded MP3s, not the robotic voice |
| Intro — pacing | NOT WORKING | With `?` untouched it reached cue **C3** within ~4 s; C3 is scheduled at 36 s | `intro-stage.tsx` advances by cue index with a 1.5 s cap instead of the timeline; scenes do not wait for the line |
| Intro — visuals | NOT WORKING | `document.querySelectorAll('canvas').length === 0` on `/en` and `/ar` during the intro; backdrop is `earth-day.jpg` | No 3D globe, no motifs verified |
| Hub + 4 cards | WORKS | Hub state renders with header/footer chrome and the 4 options (`Press 1–4`) | |
| Globe — 3D / textures / drag | PARTIAL | `/en/listen` has exactly **1** `<canvas>`; `data-testid="react-globe"` mounted | Gate and intro have **0** canvases. Drag-to-rotate not verified |
| 13 data views — temperature | WORKS (real) | `temperature.json`: GISTEMP, 46 frames, 0 sample frames | |
| — sea_ice | WORKS (real) | NSIDC, 27 frames, 0 sample | |
| — co2 | WORKS (real) | NOAA GML, 9 frames, 0 sample | |
| — night_lights | WORKS (real) | 2 frames, 0 sample (Black Marble) | |
| — ocean_sst | WORKS (real) | GHRSST MUR, 34 frames, 0 sample | |
| — aerosols | WORKS (real) | MERRA-2, 57 frames, 0 sample | |
| — air_quality | PARTIAL | Layer file has **0 frames**; only live Open-Meteo feeds return data | No historical series; live-only |
| — lightning | WORKS (real) | ISS LIS, 18 frames, 0 sample | |
| — forest | WORKS (real) | GEDI, 1 frame, 0 sample | Single frame only |
| — precipitation | WORKS (real) | GPM IMERG, 42 frames, 0 sample | |
| — events | WORKS (real) | EONET markers; `/api/live/eonet` → 200, 5 items, `live` | |
| — wildfire (Fire history) | DEMO DATA | Only `wildfire.sample.json` exists; no real layer file | |
| — ocean_currents | DEMO DATA | Only `ocean_currents.sample.json` exists | |
| Live data API | WORKS | 7/7 feeds return 200 with a source and `asOf`: gistemp (snapshot, 2026-11-13), nsidc, noaa-gml, eonet, firms-24h (200 items), open-meteo, open-meteo-aq (all live, 2026-11-14) | |
| Year slider | PARTIAL | 3 `input[type=range]`/`role=slider` elements on `/en/listen` | Did not verify the cursor changes the rendered year |
| Sonification per view | PARTIAL | Controls render, 0 console errors | Headless browser has no audio output; real-instrument vs synth not verifiable here |
| Symphony | PARTIAL | `/en/symphony`: 1 canvas, 27 buttons, 0 console errors | 60 s playback smoothness not measured |
| Tutorial — 7 steps | PARTIAL | Shows `Step 1 of 7` | **Embeds the whole Explore panel** (`[data-testid="globe"]` present) instead of only the step |
| How it sounds | PARTIAL | Buttons: `Play lowest year`, `Play highest year`, `Replay the intro` | **No per-instrument "Hear it" button exists** |
| Quiz | PARTIAL | `Guess the Earth` renders a question and 10 buttons | Excluded answer correctness from scope |
| Guide | WORKS | `/en/guide` renders with a sources section; 1935 chars of content | |
| Settings | WORKS | 6 switches; toggling persists (`aria-checked` stays after reload; `el.settings.v1` written) | |
| AI agent — text | NOT WORKING | 5 commands (`play temperature`, `go to 1990`, `open settings`, `switch to Arabic`, `what am I hearing`) all returned `{"actions":[], "provider":"none"}` and “I didn't catch that” | Needs an LLM key **and** a rule-based fallback for basic commands |
| AI agent — voice | NOT WORKING | No microphone in headless; the text path it depends on already returns no actions | Untestable by construction |
| Narration — recorded vs robotic | PARTIAL | Records play from `/audio/narration` (212/212 manifest URLs return 200) | `speakText()` still falls through to `speechSynthesis` when a clip is missing, so a robotic voice is still reachable |
| Captions | NOT WORKING | `[data-testid="caption-bar"]` count **0** on `/en/listen` and after clicking narration on `/en/how-it-sounds`; 5 `aria-live` regions exist | Only sr-only live regions; no visible caption line |
| Offline `?demo=1` | PARTIAL | Page renders with a demo banner | 0 canvases in demo; offline behaviour not simulated |
| Mobile 390 px | WORKS | `/en` and `/ar`: `scrollWidth === clientWidth === 390`, no horizontal overflow | |
| Arabic RTL | WORKS | `/ar`: `dir=rtl`, `lang=ar`; intro headline renders in Egyptian Arabic | |
| Header/footer links | WORKS | 13 unique hrefs; every internal one returns **200** | |

## Compliance checklist

| # | Rule | Result | Evidence |
| --- | --- | --- | --- |
| 1 | No images/video/voices/likeness of anyone under 18 | **PASS (no evidence found)** | No photographic people assets in `public/`; textures are NASA GIBS. Cannot prove absence in git history |
| 2 | Every AI-generated image/video has a visible "AI-generated" watermark | **PASS (N/A)** | No AI-generated images or video found in `public/` or the repo |
| 3 | AI audio disclosed on About, README, and MP3 ID3 | **FAIL** | About credits do mention “Voices: Chatterbox by Resemble AI (MIT, watermarked)”. **README has no disclosure.** **0 of 40 sampled MP3s contain an ID3 `AI-generated voice (Chatterbox)` comment** |
| 4 | Credits for every asset (source + license) | **PARTIAL** | `ATTRIBUTION.md` is detailed and correct; `/en/data` lists sources. **`CREDITS.md` does not exist** (rule names it explicitly) |
| 5 | No NASA logo/identity; "not endorsed" line present | **PASS** | No NASA logo assets found; footer copy `Uses NASA data. Not endorsed by NASA.` present in messages and README |
| 6 | Every external link opens in Incognito without login | **FAIL** | GitHub link resolves publicly, but the **Vercel deployment is 404**, so the deployed-site link fails the rule |

## Safe to claim in the demo/PDF

Only these — everything else is PARTIAL or worse:

- Language gate works: Arabic switches the whole interface to RTL Egyptian Arabic.
- Hub with four destinations, reachable by number key or click.
- The intro plays **recorded human-voice MP3s** (not a robotic voice).
- 11 of the 13 views are built on real source series (listed above with their sources).
- The 7 live data feeds return real values with a source and a timestamp.
- Settings persist across reload.
- No horizontal overflow at 390 px in EN or AR.
- Every header/footer link resolves (200).
- Guide page and About/Data source credits.

**Do not claim:** working AI agent, working captions, working intro pacing/3D intro,
"Fire history" or "Ocean currents" as real data, the Vercel live URL, or "Hear it" per
instrument.

## Reproduce

```bash
pnpm build && npx next start -p 3100
# then the Playwright probes described in the Method row
```
