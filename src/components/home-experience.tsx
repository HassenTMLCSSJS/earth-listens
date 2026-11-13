'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { subscribe } from '@/core/bus';
import { useAppStore } from '@/core/store';
import { useContent } from '@/core/catalog';
import { speakNarration } from '@/modules/narration';
import { unlockAudio } from '@/modules/sonification';
import { Button } from '@/components/ui/button';
import { ChapterNav } from '@/components/ui/chapter-nav';

const CHAPTERS = [1, 2, 3, 4, 5, 6] as const;

function HomeStory() {
  const t = useTranslations();
  const introSeen = useAppStore((state) => state.introSeen);
  const demo = useAppStore((state) => state.demo);
  const sample = useAppStore((state) => state.sample);
  const dispatch = useAppStore((state) => state.dispatch);
  const markIntroSeen = useAppStore((state) => state.markIntroSeen);
  const ready = useContent((state) => state.ready);
  const [phase, setPhase] = useState<'gate' | 'intro' | 'story'>(
    introSeen || demo ? 'story' : 'gate',
  );
  const [chapter, setChapter] = useState(0);
  const [line, setLine] = useState(0);
  const visible = phase === 'intro' ? 'intro' : demo || introSeen ? 'story' : phase;

  useEffect(() => {
    if (visible !== 'intro') return;
    const reduce = document.documentElement.dataset.motion === 'reduce';
    let cancelled = false;
    const spoken = new Set<string>();
    const say = (id: 'intro.line1' | 'intro.line2') => {
      if (spoken.has(id) || cancelled) return;
      spoken.add(id);
      void speakNarration(id, document.documentElement.lang === 'ar' ? 'ar' : 'en', { sample });
    };
    if (reduce) {
      say('intro.line1');
      say('intro.line2');
      const timer = window.setTimeout(() => finish(), 4000);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }
    let timeline: { kill: () => void } | null = null;
    void import('gsap').then(async (mod) => {
      if (cancelled) return;
      const gsap = mod.default;
      try {
        const split = await import('gsap/SplitText');
        gsap.registerPlugin(split.SplitText);
      } catch {
        /* SplitText is optional if the bonus plugin is unavailable. */
      }
      const tl = gsap.timeline({ onComplete: () => finish() });
      timeline = tl;
      tl.call(() => say('intro.line1'), [], 3);
      tl.call(() => setLine(1), [], 3);
      tl.fromTo(
        '[data-intro-line="1"]',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.2 },
        3,
      );
      tl.call(() => setLine(2), [], 6);
      tl.call(() => say('intro.line2'), [], 9);
      tl.fromTo(
        '[data-intro-line="2"]',
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 1.2 },
        9,
      );
    });
    return () => {
      cancelled = true;
      timeline?.kill();
    };
    function finish() {
      if (cancelled) return;
      markIntroSeen(true);
      setPhase('story');
      void speakNarration('onboarding.main', document.documentElement.lang === 'ar' ? 'ar' : 'en', {
        sample,
      });
    }
  }, [visible, markIntroSeen, sample]);

  useEffect(() => {
    return subscribe('*', (action) => {
      if (visible !== 'story' && action.type === 'skip') {
        markIntroSeen(true);
        setPhase('story');
      }
      if (visible === 'story' && action.type === 'next')
        setChapter((value) => Math.min(5, value + 1));
      if (visible === 'story' && action.type === 'back')
        setChapter((value) => Math.max(0, value - 1));
      if (visible === 'intro' && (action.type === 'skip' || action.type === 'next')) {
        markIntroSeen(true);
        setPhase('story');
      }
    });
  }, [visible, markIntroSeen]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return;
      if (event.key === 'PageDown') {
        event.preventDefault();
        setChapter((value) => Math.min(5, value + 1));
      }
      if (event.key === 'PageUp') {
        event.preventDefault();
        setChapter((value) => Math.max(0, value - 1));
      }
      if (event.key === 'Escape' && visible !== 'story') {
        markIntroSeen(true);
        setPhase('story');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, markIntroSeen]);

  if (visible === 'gate') {
    return (
      <section className="starfield stage grid min-h-[80vh] place-items-center px-6 text-center">
        <div className="orbit" aria-hidden="true">
          <span className="horizon" />
          <span className="planet" />
        </div>
        <div className="relative">
          <p className="text-accent text-sm tracking-[0.3em]">{t('gate.kicker')}</p>
          <h1 className="display mt-4">{t('gate.title')}</h1>
          <p className="mt-4 text-lg">{t('gate.headphones')}</p>
          <Button
            className="glow mt-8"
            // The gate exists so the first keyboard action can start audio.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onClick={() => {
              unlockAudio();
              const reduce =
                window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
                document.documentElement.dataset.motion === 'reduce';
              setLine(reduce ? 2 : 0);
              setPhase('intro');
            }}
          >
            {t('gate.begin')}
          </Button>
        </div>
      </section>
    );
  }

  if (visible === 'intro') {
    return (
      <section className="starfield stage grid min-h-[80vh] place-items-center px-6 text-center">
        <div className="orbit" aria-hidden="true">
          <span className="horizon" />
          <span className="planet" />
        </div>
        <div className="relative">
          <p
            data-intro-line="1"
            className="intro-line display text-4xl"
            style={{ opacity: line >= 1 ? 1 : 0 }}
          >
            {t('intro.line1')}
          </p>
          <p
            data-intro-line="2"
            className="intro-line display mt-8 text-4xl"
            style={{ opacity: line >= 2 ? 1 : 0 }}
          >
            {t('intro.line2')}
          </p>
          <button
            type="button"
            className="mt-10 min-h-11 rounded-full border border-white/30 px-5"
            onClick={() => {
              markIntroSeen(true);
              setPhase('story');
            }}
          >
            {t('intro.skip')}
          </button>
        </div>
      </section>
    );
  }

  const key = `c${chapter + 1}` as const;
  return (
    <article className="mx-auto grid max-w-5xl gap-8 px-4 py-10">
      <ChapterNav count={CHAPTERS.length} current={chapter} onSelect={setChapter} />
      <section className="chapter panel p-8 md:p-12" aria-labelledby="chapter-title">
        <p className="text-accent text-sm">
          {chapter + 1} / {CHAPTERS.length}
        </p>
        <h1 id="chapter-title" className="display mt-3 text-5xl">
          {t(`story.${key}title`)}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed">{t(`story.${key}body`)}</p>
        {chapter === 1 && ready ? (
          <img
            src="/frames/temperature/2020.webp"
            alt={t('banner.sample')}
            className="mt-6 aspect-[2/1] w-full rounded-2xl object-cover"
          />
        ) : null}
        {chapter === 4 ? (
          <label className="mt-6 block">
            {t('listen.when')}
            <input
              className="mt-2 w-full"
              type="range"
              min={1880}
              max={2025}
              defaultValue={2020}
              onChange={(event) =>
                dispatch({ type: 'set_time', from: Number(event.target.value) }, 'pointer')
              }
            />
          </label>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              unlockAudio();
              const id = chapter === 0 ? 'co2' : 'temperature';
              dispatch({ type: 'select_phenomenon', id }, 'pointer');
              dispatch({ type: 'play' }, 'pointer');
            }}
          >
            {t('story.play')}
          </Button>
          <button
            type="button"
            className="min-h-11 rounded-full border border-white/20 px-4"
            onClick={() => setChapter((value) => Math.max(0, value - 1))}
          >
            {t('story.back')}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full border border-white/20 px-4"
            onClick={() => setChapter((value) => Math.min(5, value + 1))}
          >
            {t('story.next')}
          </button>
        </div>
        {chapter === 5 ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/listen"
              prefetch={false}
              className="bg-warm text-space-950 inline-flex min-h-11 items-center rounded-full px-5 font-medium"
            >
              {t('story.start')}
            </Link>
            <button
              type="button"
              className="min-h-11 rounded-full border border-white/20 px-4"
              onClick={() => dispatch({ type: 'set_mode', mode: 'audio_first' }, 'pointer')}
            >
              {t('story.audio')}
            </button>
            <Link
              href="/tutorial"
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-4"
            >
              {t('story.tutorial')}
            </Link>
            <Link
              href="/quiz"
              prefetch={false}
              className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-4"
            >
              {t('story.quiz')}
            </Link>
          </div>
        ) : null}
        <p className="mt-6 text-sm" lang="en">
          {t('banner.nasa')}
        </p>
      </section>
    </article>
  );
}

export function HomeExperience() {
  const introNonce = useAppStore((state) => state.introNonce);
  return <HomeStory key={introNonce} />;
}
