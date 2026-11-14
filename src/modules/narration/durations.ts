import type { NarrationId } from './speak';

/**
 * Clip lengths in seconds from `docs/handoff-v5/content/narration-lines.json`.
 * Only used as a safety timeout when a line cannot report that it ended (for
 * example when screen-reader mode resolves the narration immediately).
 */
export const NARRATION_SECONDS: Partial<Record<NarrationId, number>> = {
  'gate.prompt': 9,
  'gate.reprompt': 5,
  'gate.welcome_back': 4,
  'mode.listening.confirm': 9,
  'mode.visual.confirm': 4,
  'mode.default_listening': 5,
  'mode.default_visual': 5,
  'err.mic_denied': 6,
  'err.didnt_catch': 3,
};

const FALLBACK_SECONDS = 5;
const SAFETY_MARGIN_SECONDS = 1.5;

export function narrationSeconds(id: NarrationId): number {
  return NARRATION_SECONDS[id] ?? FALLBACK_SECONDS;
}

/** How long to wait before moving on when `speakNarration` never resolves. */
export function narrationSafetyMs(id: NarrationId): number {
  return (narrationSeconds(id) + SAFETY_MARGIN_SECONDS) * 1000;
}
