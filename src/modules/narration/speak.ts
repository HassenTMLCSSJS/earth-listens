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
