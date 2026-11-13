# Decisions

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

**Player timbres.** The score names warm-lead, crackle-marimba, glass-bells, and beating-drone. The player still uses one sine synth. See `docs/SONIFICATION.md`.
