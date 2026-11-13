## Summary

<!-- What changed, and which module owns it. -->

## Definition of done

**Build and tests**

- [ ] `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm format:check && pnpm build` pass on Node 24.
- [ ] `pnpm test` passes the Earth Sonification Language cases, the parser cases, and the coverage thresholds. The determinism snapshot matches a second run.
- [ ] `pnpm py:test` passes.
- [ ] `pnpm data:validate` passes. Every sample file has `sample: true`, and the sample banner is visible.

**End to end and accessibility**

- [ ] Playwright: keyboard intro to listen, tutorial narration, quiz counts, RTL, reduced motion, axe with zero serious or critical violations on every route in English and Arabic, and the offline `?demo=1` run in both languages.
- [ ] Lighthouse accessibility is at least 95 on `/en`, `/ar`, `/en/listen?demo=1`, `/en/quiz`, `/en/guide`, and `/en/tutorial`.

**Safety and attribution**

- [ ] No secrets. `.env.example` holds names only.
- [ ] `/api/agent` works with the mock provider and degrades with no keys.
- [ ] The FIRMS acknowledgement and the other source credits appear on `/data`, in `ATTRIBUTION.md`, and in the README.

## Measured results

<!-- Fill with numbers from this PR. Do not paste a score you did not run. -->

- Unit tests:
- Pipeline tests:
- Playwright:
- axe:
- Lighthouse:

## Notes

- Sample files are synthetic. Do not describe them as measurements.
- Recommend branch protection on `main` and `develop`: require a pull request, green CI, and one review, and block force-pushes. Do not change repository settings from a pull request.
