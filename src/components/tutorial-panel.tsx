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
      <section className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-8">
        <span className="v5-eyebrow">{t('title')}</span>
        <h1 className="display text-5xl">{t('doneTitle')}</h1>
        <p className="text-ink-muted">
          {t('progress', { step: TUTORIAL_STEPS.length, total: TUTORIAL_STEPS.length })}
        </p>
        <p className="v5-lead">{t('done')}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-8">
      <span className="v5-eyebrow">{t('title')}</span>
      <h1 ref={heading} tabIndex={-1} className="display text-5xl outline-none">
        {t('title')}
      </h1>
      <div className="v5-card grid gap-4 p-6">
        <p className="text-ink-subtle text-sm">
          {t('progress', { step: index + 1, total: TUTORIAL_STEPS.length })}
        </p>
        <h2 className="v5-h2">{lang === 'ar' ? step.text.ar : step.text.en}</h2>
        {hint ? (
          <p className="border-s-gold border-s-2 ps-3 text-sm">
            {lang === 'ar' ? step.hint.ar : step.hint.en}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="focus-visible:ring-ring/50 min-h-11 rounded-full border border-white/20 px-4 outline-none hover:border-white/40 focus-visible:ring-[3px]"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
          >
            {t('back')}
          </button>
          <button
            type="button"
            className="focus-visible:ring-ring/50 min-h-11 rounded-full border border-white/20 px-4 outline-none hover:border-white/40 focus-visible:ring-[3px]"
            onClick={() => setIndex((value) => value + 1)}
          >
            {t('skip')}
          </button>
        </div>
      </div>
      <Jukebox embedded />
    </section>
  );
}
