import type { Lang } from '@/core/actions';
import { announce } from './announcer';
import { narrationText, withSampleNote } from './script';

export const NARRATION_IDS = [
  'intro.line1',
  'intro.line2',
  'onboarding.main',
  'story.ch1',
  'story.ch2',
  'story.ch3',
  'story.ch4',
  'story.ch5',
  'story.ch6',
  'tutorial.step1',
  'tutorial.step2',
  'tutorial.step3',
  'tutorial.step4',
  'tutorial.step5',
  'tutorial.step6',
  'tutorial.step7',
  'quiz.intro',
  'quiz.question',
  'quiz.correct',
  'quiz.wrong',
  'quiz.end',
  'help.commands',
  'gate.prompt',
  'gate.reprompt',
  'gate.welcome_back',
  'mode.listening.confirm',
  'mode.visual.confirm',
  'mode.default_listening',
  'mode.default_visual',
  'err.mic_denied',
  'err.didnt_catch',
  'lang.switched',
  'intro.l1',
  'intro.l2',
  'intro.l3',
  'intro.l4',
  'intro.l5',
  'intro.l6',
  'intro.l7',
  'intro.l7_alt',
  'menu.main',
  'menu.reprompt',
  'view.temperature',
  'view.wildfire',
  'view.sea_ice',
  'view.co2',
  'view.night_lights',
  'view.ocean_sst',
  'view.ocean_currents',
  'view.aerosols',
  'view.air_quality',
  'view.lightning',
  'view.forest',
  'view.precipitation',
  'view.events',
] as const;

export type NarrationId = (typeof NARRATION_IDS)[number];

export async function speakNarration(
  id: NarrationId,
  lang: Lang = 'en',
  opts?: { sample?: boolean },
): Promise<void> {
  if (typeof window !== 'undefined') {
    window.__elNarration = window.__elNarration ?? [];
    window.__elNarration.push(id);
  }
  const text = withSampleNote(narrationText(id), opts?.sample === true);
  announce(text, { narrationId: id, speak: true });
  if (typeof window === 'undefined') return;
  const demo = document.documentElement.dataset.demo === '1';
  const sr = document.documentElement.dataset.sr === '1';
  if (sr) return;
  try {
    const { speakText } = await import('@/modules/voice');
    await speakText(lang === 'ar' ? text.ar : text.en, lang, { demo, rate: 1 });
  } catch {
    /* Captions already carry the line. */
  }
}
