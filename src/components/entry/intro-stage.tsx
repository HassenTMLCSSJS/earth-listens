'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'motion/react';
import type { Lang } from '@/core/actions';
import { INTRO_CUES, temperatureMotif } from '@/modules/entry';
import { startIntro, getIntroTimeline } from '@/modules/intro';
import { speakNarration } from '@/modules/narration';
import { narrationQueue } from '@/lib/audio/narration-queue';
import { getGlobeController } from '@/modules/globe';
import { OverlayStage } from '@/modules/models';

const EarthGlobe = dynamic(
  () => import('@/components/globe/earth-globe').then((module) => module.EarthGlobe),
  { ssr: false, loading: () => <IntroGlobeFallback /> },
);

const IntroInstrument = dynamic(
  () => import('@/components/entry/intro-instrument').then((module) => module.IntroInstrument),
  { ssr: false },
);

const SCENES: Record<number, string[]> = {
  1: ['headphones', 'focus_ring'],
  2: ['sada', 'focus_ring'],
  3: ['note_field'],
  4: [],
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
  7: ['sada'],
  8: ['cairo_marker', 'sada', 'stage_disc'],
};

const SCENE_DRIVE: Record<
  number,
  {
    framing: 'hero' | 'hidden';
    lat: number;
    lon: number;
    alt: number;
    ms: number;
    rotate?: boolean;
    dim?: number;
  }
> = {
  1: { framing: 'hidden', lat: 20, lon: 0, alt: 3.0, ms: 1000 },
  2: { framing: 'hero', lat: 20, lon: 10, alt: 2.4, ms: 6000, rotate: true },
  3: { framing: 'hero', lat: 15, lon: 20, alt: 2.0, ms: 4000, rotate: true },
  4: { framing: 'hero', lat: 10, lon: 25, alt: 2.3, ms: 3000, rotate: true },
  5: { framing: 'hero', lat: 20, lon: 20, alt: 2.6, ms: 3000, rotate: true },
  6: { framing: 'hero', lat: 20, lon: 20, alt: 2.6, ms: 3000, rotate: true },
  7: { framing: 'hero', lat: 20, lon: 20, alt: 2.6, ms: 3000, rotate: false, dim: 0.35 },
  8: { framing: 'hero', lat: 30.04, lon: 31.24, alt: 1.9, ms: 2500, rotate: false, dim: 0 },
};

/** Cumulative minimum seconds before each spoken cue may advance. */
const MIN_HELD_END = [10, 22, 36, 48, 64, 78, 88];

const CAIRO = [
  { lat: 30.04, lng: 31.24, altitude: 0.04, color: '#f2c46d', radius: 0.09, label: 'Cairo' },
];

function IntroGlobeFallback() {
  return (
    <div
      data-testid="intro-globe-loading"
      className="absolute inset-0 grid place-items-center bg-[#05070d]"
    >
      <div className="size-40 animate-pulse rounded-full border border-white/20 bg-[radial-gradient(circle_at_35%_30%,rgb(84_150_255/.4),transparent_70%)]" />
    </div>
  );
}

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
  const [globeReady, setGlobeReady] = useState(false);
  const startedAt = useRef(0);
  const cue = INTRO_CUES[index] ?? INTRO_CUES[0];
  const scene = cue?.scene ?? 1;
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const reduced =
    typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduce';

  useEffect(() => {
    if (!globeReady) return;
    const controller = getGlobeController();
    if (!controller) return;
    const drive = SCENE_DRIVE[scene] ?? SCENE_DRIVE[2]!;
    controller.setFraming(drive.framing);
    controller.flyTo(drive.lat, drive.lon, drive.alt, reduced ? 0 : drive.ms);
    controller.setAutoRotate(Boolean(drive.rotate) && !reduced, drive.rotate ? 0.25 : 0);
    if (typeof drive.dim === 'number') controller.setUniform('dim', drive.dim);
  }, [globeReady, scene, reduced]);

  useEffect(() => {
    let dead = false;
    if (paused) {
      narrationQueue.stop();
      return () => undefined;
    }
    const timeline = startIntro({ locale: lang, mode });
    const current = INTRO_CUES[index];
    if (!current) return;
    if (!startedAt.current) startedAt.current = performance.now();
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
    const elapsed = performance.now() - startedAt.current;
    const minHold = Math.max(0, (MIN_HELD_END[index] ?? 88) * 1000 - elapsed);
    const timer = window.setTimeout(() => {
      void Promise.allSettled([
        speakNarration(current.line, lang),
        new Promise((resolve) => window.setTimeout(resolve, minHold)),
      ]).then(() => {
        if (dead || paused) return;
        if (index >= INTRO_CUES.length - 1) onDoneRef.current();
        else setIndex((value) => value + 1);
      });
    }, 40);
    return () => {
      dead = true;
      window.clearTimeout(timer);
      timeline.pause();
    };
  }, [index, lang, mode, paused]);

  const pointColor = useMemo(() => '#f2c46d', []);
  const points = scene >= 7 ? CAIRO : [];

  if (!cue) return null;

  const skipIntro = () => {
    narrationQueue.stop();
    onSkip();
  };

  return (
    <section
      data-testid="intro-stage"
      data-intro-cue={cue.id}
      data-scene={scene}
      className="fixed inset-0 z-40 grid content-end overflow-hidden bg-[#05070d]"
    >
      <h1 className="sr-only">Earth Listens</h1>

      <EarthGlobe
        lat={30.04}
        lon={31.24}
        points={points}
        arcs={[]}
        reducedMotion={reduced}
        framing={SCENE_DRIVE[scene]?.framing ?? 'hero'}
        playing={!paused}
        onReady={() => setGlobeReady(true)}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,transparent_35%,rgb(5_7_13/.82)_92%)]"
      />

      {scene === 4 ? (
        <IntroInstrument id="satellite" playing={!paused} reducedMotion={reduced} />
      ) : null}
      {scene === 6 ? (
        <IntroInstrument id="inst_guitar" playing={!paused} reducedMotion={reduced} />
      ) : null}

      <AnimatePresence mode="sync">
        <motion.div
          key={index}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.06, filter: 'blur(10px)' }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: 'blur(6px)' }}
          transition={{ duration: reduced ? 0.25 : 0.95, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute inset-0 grid place-items-center content-end gap-6 p-6"
        >
          <OverlayStage
            ids={SCENES[scene] ?? ['headphones']}
            lang={locale === 'ar' ? 'ar' : 'en'}
            playing={!paused}
            intensity={0.6}
            reducedMotion={reduced}
          />
          <p className="max-w-xl text-center text-2xl" data-intro-line={index + 1}>
            {t(cue.line)}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-auto relative z-10 flex justify-center gap-3 p-6">
        <button
          type="button"
          className="min-h-11 rounded-full border border-white/30 px-4"
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? t('header.resume') : t('header.pause')}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full border border-white/30 px-4"
          onClick={skipIntro}
        >
          {t('intro.skip')}
        </button>
      </div>
    </section>
  );
}
