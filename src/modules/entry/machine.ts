import type { Lang, Mode } from '@/core/actions';
import type { NarrationId } from '@/modules/narration';
import { normalizeUtterance } from '@/modules/agent';

export type EntryPhase = 'pre' | 'prompt' | 'listen1' | 'reprompt' | 'listen2' | 'intro' | 'hub';

export type ModeSource = 'click' | 'space' | 'voice' | 'fallback';
export type Gesture = 'key' | 'pointer';

export interface EntryState {
  phase: EntryPhase;
  lang: Lang;
  mode: Mode | null;
  modeSource: ModeSource | null;
  gesture: Gesture | null;
  introSeen: boolean;
  line: NarrationId | null;
}

export type EntryEvent =
  | { type: 'boot'; introSeen: boolean; savedMode: Mode | null; lang: Lang }
  | { type: 'language'; lang: Lang }
  | { type: 'sound'; gesture: Gesture }
  | { type: 'prompt_done' }
  | { type: 'reprompt_done' }
  | { type: 'space' }
  | { type: 'speech'; text: string; lang: Lang }
  | { type: 'silence' }
  | { type: 'mic_denied' }
  | { type: 'skip' }
  | { type: 'intro_done' }
  | { type: 'replay' };

const LISTEN_WORDS = ['listen', 'start', 'sound', 'yes', 'اسمع', 'ابدا', 'صوت', 'ايوه'];

export function initialEntry(lang: Lang): EntryState {
  return {
    phase: 'pre',
    lang,
    mode: null,
    modeSource: null,
    gesture: null,
    introSeen: false,
    line: null,
  };
}

function listeningChoice(text: string): boolean {
  const normalized = normalizeUtterance(text);
  if (!normalized) return false;
  const tokens = normalized.split(' ').filter((token) => token.length > 0);
  if (LISTEN_WORDS.some((word) => tokens.includes(word) || normalized.includes(word))) return true;
  return tokens.length >= 2;
}

function toIntro(
  state: EntryState,
  patch: Pick<EntryState, 'mode' | 'modeSource' | 'line'> & { lang?: Lang },
): EntryState {
  return {
    ...state,
    ...patch,
    phase: 'intro',
    introSeen: false,
  };
}

/**
 * Entry decision tree. Mode comes only from a click, a key, or speech.
 * Motion preferences and the user agent are intentionally not inputs.
 */
export function reduceEntry(state: EntryState, event: EntryEvent): EntryState {
  switch (event.type) {
    case 'boot':
      if (!event.savedMode) return { ...state, lang: event.lang, introSeen: event.introSeen };
      return {
        ...state,
        lang: event.lang,
        mode: event.savedMode,
        modeSource: 'click',
        introSeen: event.introSeen,
        phase: event.introSeen ? 'hub' : 'intro',
        line: event.introSeen ? 'gate.welcome_back' : null,
      };
    case 'language':
      if (state.phase === 'intro' || state.phase === 'hub') return state;
      return toIntro(state, {
        lang: event.lang,
        mode: 'visual',
        modeSource: 'click',
        line: 'mode.visual.confirm',
      });
    case 'sound':
      if (state.phase !== 'pre') return state;
      return {
        ...state,
        phase: 'prompt',
        gesture: event.gesture,
        line: 'gate.prompt',
      };
    case 'prompt_done':
      if (state.phase !== 'prompt') return state;
      return { ...state, phase: 'listen1', line: null };
    case 'reprompt_done':
      if (state.phase !== 'reprompt') return state;
      return { ...state, phase: 'listen2', line: null };
    case 'space':
      if (state.phase !== 'listen1' && state.phase !== 'listen2') return state;
      return toIntro(state, {
        mode: 'audio_first',
        modeSource: 'space',
        line: 'mode.listening.confirm',
      });
    case 'speech': {
      if (state.phase !== 'listen1' && state.phase !== 'listen2') return state;
      if (!listeningChoice(event.text)) {
        return { ...state, line: 'err.didnt_catch' };
      }
      return toIntro(state, {
        lang: event.lang,
        mode: 'audio_first',
        modeSource: 'voice',
        line: 'mode.listening.confirm',
      });
    }
    case 'silence':
      if (state.phase === 'listen1') {
        return { ...state, phase: 'reprompt', line: 'gate.reprompt' };
      }
      if (state.phase === 'listen2') {
        const byKey = state.gesture !== 'pointer';
        return toIntro(state, {
          mode: byKey ? 'audio_first' : 'visual',
          modeSource: 'fallback',
          line: byKey ? 'mode.default_listening' : 'mode.default_visual',
        });
      }
      return state;
    case 'mic_denied':
      if (state.phase !== 'listen1' && state.phase !== 'listen2') return state;
      return { ...state, line: 'err.mic_denied' };
    case 'skip':
      return { ...state, phase: 'hub', introSeen: true, line: 'menu.main' };
    case 'intro_done':
      if (state.phase !== 'intro') return state;
      return { ...state, phase: 'hub', introSeen: true, line: 'menu.main' };
    case 'replay':
      return state.mode
        ? { ...state, phase: 'intro', introSeen: false, line: null }
        : { ...state, phase: 'pre', introSeen: false, line: null };
    default:
      return state;
  }
}
