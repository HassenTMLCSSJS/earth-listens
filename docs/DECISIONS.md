# Decisions

## 13 Nov 2026 — data integration

**Branch.** `feat/data-integration` is the only branch for this phase. It starts with the CI pnpm `allowBuilds` fix so the web job is not skipped.

**Textures.** GIBS WMS returned real 2048×1024 Blue Marble, shaded relief, and Black Marble images on 13 Nov 2026. They replace the procedural stand-in. `public/textures/SOURCE.txt` records the hashes. 4K and 8K are not committed.

**ETOPO.** The 60 arc-second surface GeoTIFF (SHA-256 `9d27d4b8…`) was area-averaged with GDAL to 2048×1024. Height is stored as 8-bit with offset −10900 m and scale 19700 m. A spot check after averaging: Himalaya about 6218 m, Mariana about −9433 m. That smoothing is what a 2K grid does to a 60 arc-second source. It is not a new elevation model.

**Night lights.** The series is cosine-weighted luma of the 1024×512 Black Marble PNGs for 2012-01-01 and 2016-01-01. The label everywhere is "night brightness index (image-derived, not calibrated radiance)". The p5–p95 of the 2016 image is 5.51–51.75 and that is the sonification range. `sample` is false. The other new layers stay `sample: true` because a full frame history was not fetched.

**Symphony.** "Play everything" still combines temperature, wildfire, sea ice, and CO₂. New layers are selectable on their own. The four-voice ceiling in the reducer is unchanged.

**Asset host.** `https://pub-f4844155e9804bb5adcb0c121896e82b.r2.dev` is the public R2 URL. The upload script defaults to a dry run. No release was created and nothing was uploaded from this build.

**Colormap parser.** The GIBS v1.3 XML is read with regular expressions in TypeScript and Python so the browser bundle does not take a DOM parser. The recorded MUR PNG matches the colormap on every opaque pixel.

**Service worker.** A small `public/sw.js` caches textures. Serwist was not added; a hand-written worker keeps the install free of another framework and still does cache-first for textures.

## 13 Nov 2026

**Hackathon dates.** NASA Space Apps Cairo runs 13–14 November 2026. Day-based milestones in the build brief move one day earlier. The submission deadline stays “to be confirmed with Space Apps Cairo”. The PRNG seed `mulberry32(20261114)` is a technical constant and did not change.

**`src/proxy.ts` instead of `middleware.ts`.** Next.js 16 uses `proxy.ts`. `next-intl` `createMiddleware` is still the default export. The proxy also sets the `el.demo` cookie and adds a second, stricter Content-Security-Policy when `demo=1` or the cookie is set. Browsers intersect the two policies. `next.config.ts` sends the wider policy, including `huggingface.co`, `cdn-lfs.huggingface.co`, and `cas-bridge.xethub.hf.co`, so Kokoro and Piper can download outside demo mode. `unsafe-inline` stays because Next’s bootstrap needs it. `wasm-unsafe-eval` is there for the speech models. `Permissions-Policy` is `microphone=(self)`.

**Piper’s Node imports.** `@mintplex-labs/piper-tts-web` mentions `fs` and `path` inside its emscripten bundle. Turbopack aliases those modules to `src/stubs/fs.js` and `src/stubs/path.js` in the browser. The browser branch never calls them.

**eslint 10 with jsx-a11y 6.10.2.** The plugin’s peer range stops at ESLint 9. pnpm allows that pair in `pnpm-workspace.yaml`. The strict rule set is spread onto the Next config. Spreading the plugin object throws “Cannot redefine plugin jsx-a11y”. `@next/next/no-img-element` is off because demo frames are blob URLs. The globe’s `role="application"` and `tabIndex={0}`, and the Begin button’s `autoFocus`, are the behaviour the brief requires, so those two rules are disabled on those lines.

**Muted colour.** `--color-muted` is `#c5d0ea` rather than `#9aa7c7`, for contrast on `#05070d`.

**pnpm 12.** The `pnpm` key in `package.json` is ignored. Settings are in `pnpm-workspace.yaml`, including `minimumReleaseAge: 0` and the ESLint peer exception. `py:test` calls `python3` because this image has no `python` binary. CI uses `python`.

**Quiz log shape.** `localStorage` key `el.quiz.v1` stores `{ entries, explore, ease }`. A JSON array cannot keep the extra fields the brief attached to the array.

**`set_time`.** A command with only `from` moves the cursor and keeps the current range. Both ends replace the range.

**Compare notes.** Each compare note lasts 2 seconds, which is the slot length.

**Symphony wildfire.** The symphony treats wildfire as one global voice on the annual series. Sample annual values stay inside `[0, 100]` so FRP strength does not clamp.

**Frames.** Sample frames are SVG gradients converted with `sharp`, not a per-pixel buffer. Every 5th year (and every 5th wildfire day) plus the final year. They are watermarked SAMPLE.

**Globe texture.** NASA Blue Marble URLs were not reachable. `public/textures/earth-day.jpg` is a procedural stand-in. `public/textures/SOURCE.txt` says so. Do not call it a NASA image.

**Validation plots.** `pipeline/earth_pipeline/validate.py` writes SVG. matplotlib is not installed. `docs/validation/sample-check.svg` is a SAMPLE self-check.

**FIRMS.** `fetch.py` refuses to download without `--dry-run` in this base. The dry run prints `{FIRMS_MAP_KEY}`.

**Ruff.** Line length is 120.

**Owner branches.** Phases A–G landed in one pass on `feat/base-mvp`. The tag `base-phase-a` points at that green tree so the owner branches have the contracts. They are cut from the tag, which descends from `develop`, because an empty `develop` tip has no code for a teammate to open.

**Modules for the globe and the intro.** The globe and the story live in `src/components` because they are client UI. Their pure helpers stay in `sonification` and `narration`.

**Player timbres.** The score names warm-lead, crackle-marimba, glass-bells, and beating-drone. The player builds those four Tone.js instruments. See `docs/SONIFICATION.md`. Seasonal tremolo depth is computed at playback from `seasonalAmplitude / 10`. It is not stored on the note.

**Intro scroll.** After the gate and the spoken intro, the six chapters are pinned with Lenis and GSAP ScrollTrigger. Reduced motion, and the pause control, skip the pin and show one chapter at a time. The keyboard path is still Begin, Enter, Escape, then Next chapter.

**Globe shader.** The canvas is a displaced sphere plus an additive fresnel atmosphere. Layer intensity, the same 0–1 value the pitch uses, tints and lifts the surface. Each note retriggers a pulse. The texture remains the procedural stand-in. The canvas mounts after pointer or focus, or when playback starts while the browser is online. The first paint is the still image, and an offline demo does not request the Three.js chunk.

**Route focus and pause.** After the first load, a pathname change moves focus to the `h1` inside `#content`. The header pause control sets `reducedMotion` and is labelled for assistive tech.

**What the first paint loads.** The shell reads `demo` and `debug` from `window.location.search`, so the page is in the first HTML instead of a suspense fallback. English pages ship Space Grotesk 500 and Inter 400. Arabic pages ship IBM Plex Sans Arabic 400 and 500, plus the display face. Fonts are not preloaded until the page uses them. The catalog fetches the globe texture and the latest frame of each layer into the HTTP cache and leaves their URLs in place. The poster is that static texture, so it can paint before the catalog returns. Tone.js is prefetched in a module worker only when `?demo=1` is set. Kokoro and Piper load only when a caller opts into neural speech, so the tutorial does not download them on first paint. Automatic lines use the captions and `speechSynthesis`.
