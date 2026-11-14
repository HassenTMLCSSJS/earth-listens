'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Lang } from '@/core/actions';
import { INTRO_CUES, temperatureMotif } from '@/modules/entry';
import { startIntro, getIntroTimeline } from '@/modules/intro';
import { speakNarration } from '@/modules/narration';
import { OverlayStage } from '@/modules/models';

const SCENES: Record<number, string[]> = {
  1: ['headphones', 'focus_ring'],
  2: ['note_field'],
  3: ['satellite'],
  4: ['satellite'],
  5: [
    'inst_oud',
    'inst_kamanja',
    'inst_ney',
    'inst_darbuka',
    'inst_riq',
    'inst_qanun',
    'inst_chimes',
    'inst_bowl',
  ],
  6: ['jukebox_ring', 'music_box'],
  7: ['headphones'],
  8: ['cairo_marker', 'sada', 'stage_disc'],
};

export function IntroStage({
  lang,
  mode,
  onDone,
  onSkip,
}: {
  lang: Lang;
  mode: 'listening' | 'visual';
  onDone: () => void;
  onSkip: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const cue = INTRO_CUES[index] ?? INTRO_CUES[0];
  const scene = cue?.scene ?? 1;
  const onDoneRef = useRef(onDone);
  const pausedRef = useRef(paused);

  useEffect(() => {
    onDoneRef.current = onDone;
    pausedRef.current = paused;
  });

  useEffect(() => {
    let dead = false;
    const timeline = startIntro({ locale: lang, mode });
    const current = INTRO_CUES[index];
    if (!current) return;
    timeline.seek(current.seqFrom);
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(current.haptic);
    }
    if (current.id === 'C2') {
      void fetch('/data/layers/temperature.json')
        .then((response) => response.json())
        .then((body: { series?: { global?: { v: number | null }[] } }) => {
          const values = (body.series?.global ?? []).flatMap((point) =>
            typeof point.v === 'number' ? [point.v] : [],
          );
          temperatureMotif(values);
        })
        .catch(() => undefined);
    }
    const timer = window.setTimeout(() => {
      void Promise.race([
        speakNarration(current.line, lang),
        new Promise((resolve) => window.setTimeout(resolve, 1500)),
      ]).then(() => {
        if (dead || pausedRef.current) return;
        if (index >= INTRO_CUES.length - 1) onDoneRef.current();
        else setIndex((value) => value + 1);
      });
    }, 40);
    return () => {
      dead = true;
      window.clearTimeout(timer);
      timeline.pause();
    };
  }, [index, lang, mode]);

  if (!cue) return null;

  return (
    <section
      data-testid="intro-stage"
      data-intro-cue={cue.id}
      data-scene={scene}
      className="fixed inset-0 z-40 grid content-end gap-6 overflow-hidden bg-[#05070d] p-6"
    >
      <h1 className="sr-only">Earth Listens</h1>
      <img
        src="/textures/earth-day.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="relative z-10 grid justify-items-center gap-4">
        <OverlayStage
          ids={SCENES[scene] ?? ['headphones']}
          lang={locale === 'ar' ? 'ar' : 'en'}
          playing={!paused}
          intensity={0.6}
          reducedMotion={
            typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduce'
          }
        />
        <p className="max-w-xl text-center text-2xl" data-intro-line={index + 1}>
          {t(cue.line)}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="min-h-11 rounded-full border border-white/30 px-4"
            onClick={() => {
              const timeline = getIntroTimeline();
              if (paused) timeline?.play();
              else timeline?.pause();
              setPaused((value) => !value);
            }}
          >
            {paused ? t('header.resume') : t('header.pause')}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full border border-white/30 px-4"
            onClick={onSkip}
          >
            {t('intro.skip')}
          </button>
        </div>
      </div>
    </section>
  );
}
