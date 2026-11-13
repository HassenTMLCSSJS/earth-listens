'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { subscribe } from '@/core/bus';
import { useAppStore } from '@/core/store';
import { speakNarration } from '@/modules/narration';
import { TUTORIAL_STEPS } from '@/modules/tutorial';
import { Jukebox } from '@/components/jukebox';

export function TutorialPanel() {
  const t = useTranslations('tutorial');
  const lang = useAppStore((state) => state.lang);
  const [index, setIndex] = useState(0);
  const [hintIndex, setHintIndex] = useState(-1);
  const heading = useRef<HTMLHeadingElement>(null);
  const step = TUTORIAL_STEPS[index];
  const hint = hintIndex === index;

  useEffect(() => {
    heading.current?.focus();
    if (!step) return;
    void speakNarration(step.narrationId, lang);
    const timer = window.setTimeout(() => setHintIndex(index), step.hintAfterMs);
    return () => window.clearTimeout(timer);
  }, [index, lang, step]);

  useEffect(() => {
    return subscribe('*', (action) => {
      const current = TUTORIAL_STEPS[index];
      if (!current) return;
      const state = useAppStore.getState();
      if (
        current.expect(action, { layers: state.layers, region: state.region, time: state.time })
      ) {
        setIndex((value) => Math.min(TUTORIAL_STEPS.length, value + 1));
      }
      if (action.type === 'back') setIndex((value) => Math.max(0, value - 1));
      if (action.type === 'skip') setIndex((value) => Math.min(TUTORIAL_STEPS.length, value + 1));
    });
  }, [index]);

  if (!step) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="display text-5xl">{t('title')}</h1>
        <p>{t('progress', { step: TUTORIAL_STEPS.length, total: TUTORIAL_STEPS.length })}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      <h1 ref={heading} tabIndex={-1} className="display text-5xl">
        {t('title')}
      </h1>
      <p>{t('progress', { step: index + 1, total: TUTORIAL_STEPS.length })}</p>
      <h2>{lang === 'ar' ? step.text.ar : step.text.en}</h2>
      {hint ? <p>{lang === 'ar' ? step.hint.ar : step.hint.en}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          className="min-h-11 rounded-full border border-white/20 px-4"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
        >
          {t('back')}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full border border-white/20 px-4"
          onClick={() => setIndex((value) => value + 1)}
        >
          {t('skip')}
        </button>
      </div>
      <Jukebox embedded />
    </section>
  );
}
