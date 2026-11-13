# Accessibility

Target: WCAG 2.2 AA. The product is voice-first for blind and low-vision listeners, and the globe is there for everyone else.

## Structure

- `lang` and `dir` are set on `<html>` for `en` and `ar`.
- Skip link, `header`, `nav`, `main`, and `footer`.
- One `h1` on each route.
- The command box is always on the page. Its accessible name is `Command` or `أمر`.
- The globe is an application widget: `role="application"`, `aria-roledescription="interactive globe"`, and it is in the tab order so the arrow keys rotate it.

## Live regions

`src/modules/narration/announcer.ts` feeds one polite region and one assertive region. The latest polite message wins a 30 ms coalesce, then the region locks for 1 second. The same text is dropped if it repeats within 2 seconds. The caption strip is a `role="log"` and can be turned off in settings.

## Shortcuts

Defined in `src/modules/a11y/shortcuts.ts` and listed in the help dialog and on `/guide`.

| Keys              | Action                                        |
| ----------------- | --------------------------------------------- |
| Alt+Shift+T       | Talk                                          |
| Alt+Shift+S       | Stop audio                                    |
| ?                 | Help                                          |
| /                 | Focus the command box                         |
| Escape            | Skip the intro, or close a dialog             |
| 1 / 2 / 3         | Quiz answers, and only while the quiz is open |
| PageDown / PageUp | Next or previous story chapter                |
| Arrow keys        | Rotate the focused globe                      |
| Home              | Reset the globe view                          |

There are no other single-letter shortcuts.

## Motion, contrast, and audio

- `prefers-reduced-motion: reduce` sets `data-motion="reduce"` and `data-gsap-disabled="true"`. CSS animations collapse to 1 ms and transitions to 200 ms. Settings can force motion on or off.
- Body text uses `#e8eefc` on `#05070d`. The muted token in the brief is `#9aa7c7`. This build uses `#c5d0ea` so muted text stays above 4.5:1 on the space background. High-contrast mode is a setting.
- Targets are at least 44 px where the hand or a keyboard activates them.
- Audio does not start until Begin, Listen, or an explicit play command. Stop is always in the header. Master volume cannot exceed 0 dB.

## Language

Every UI string is in `messages/en.json` and `messages/ar.json`. `src/modules/messages.test.ts` fails if the keys diverge. Arabic numbers use `Intl.NumberFormat('ar-EG')`. Layout uses logical properties.

## What is checked automatically

- `eslint-plugin-jsx-a11y` strict rules, on top of `eslint-config-next`.
- Playwright plus axe-core on `/`, `/listen`, `/quiz`, `/tutorial`, `/how-it-sounds`, `/guide`, `/data`, and `/settings`, in English and Arabic. Serious and critical violations fail the run.
- Lighthouse CI asserts accessibility at least 0.95 on `/en`, `/ar`, `/en/listen?demo=1`, `/en/quiz`, `/en/guide`, and `/en/tutorial`. Performance at least 0.7 is a warning.

## Still for Youssef

Route changes do not yet move focus to the `h1`. The in-app “Pause animations” control is the reduced-motion setting, not a separate button on every page. Confirm both against a screen reader before submission.
