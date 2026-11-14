'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'motion/react';
import type { Lang } from '@/core/actions';
import { INTRO_CUES, temperatureMotif } from '@/modules/entry';
import { startIntro } from '@/modules/intro';
import { narrationSafetyMs, speakNarration } from '@/modules/narration';
import { narrationQueue } from '@/lib/audio/narration-queue';
import { getGlobeController } from '@/modules/globe';
import { OverlayStage } from '@/modules/models';
import { LogoMark } from '@/components/brand/logo-mark';

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

/**
 * The whole intro sequence. Cue ids stay attached so the tests and the
 * narrated rail keep working; scene 1 is the intentional silent beat.
 */
const SEQUENCE: Array<{
  id: string;
  scene: number;
  line: (typeof INTRO_CUES)[number]['line'] | null;
  minEnd: number;
  haptic: number[];
}> = [
  { id: 'S1', scene: 1, line: null, minEnd: 10, haptic: [] },
  { id: 'C1', scene: 2, line: 'intro.l1', minEnd: 22, haptic: [60, 120, 60] },
  { id: 'C2', scene: 3, line: 'intro.l2', minEnd: 36, haptic: [200, 100, 300] },
  { id: 'C3', scene: 4, line: 'intro.l3', minEnd: 48, haptic: [20] },
  { id: 'C4', scene: 5, line: 'intro.l4', minEnd: 64, haptic: [30] },
  { id: 'C4b', scene: 6, line: null, minEnd: 78, haptic: [] },
  { id: 'C5', scene: 7, line: 'intro.l5', minEnd: 88, haptic: [] },
  { id: 'C6', scene: 8, line: 'intro.l6', minEnd: 92, haptic: [80, 40, 80, 40, 200] },
  { id: 'C7', scene: 8, line: 'intro.l7', minEnd: 100, haptic: [30, 40, 30] },
];

const CAIRO = [
  { lat: 30.04, lng: 31.24, altitude: 0.04, color: '#ffd34d', radius: 0.09, label: 'Cairo' },
];
const TICKS = [10, 22, 36, 48, 64, 78, 88];

function IntroGlobeFallback() {
  return <div data-testid="intro-globe-loading" className="bg-space-950 absolute inset-0" />;
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
  const [progress, setProgress] = useState(0);
  const startedAt = useRef(0);
  const step = SEQUENCE[index] ?? SEQUENCE[0]!;
  const scene = step.scene;
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const reduced =
    typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduce';

  useEffect(() => {
    if (paused) return undefined;
    if (!startedAt.current) startedAt.current = performance.now();
    let frame = 0;
    const loop = () => {
      setProgress(Math.min(99, ((performance.now() - startedAt.current) / 1000 / 100) * 100));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paused, index]);

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
    if (!startedAt.current) startedAt.current = performance.now();
    const timeline = startIntro({ locale: lang, mode });
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(step.haptic);
    }
    if (step.id === 'C2') {
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
    const minHold = Math.max(0, step.minEnd * 1000 - elapsed);
    const lineId = step.line;
    const narration = lineId
      ? Promise.race([
          speakNarration(lineId, lang),
          new Promise((resolve) => window.setTimeout(resolve, narrationSafetyMs(lineId))),
        ])
      : Promise.resolve();
    const timer = window.setTimeout(() => {
      void Promise.allSettled([
        narration,
        new Promise((resolve) => window.setTimeout(resolve, minHold)),
      ]).then(() => {
        if (dead || paused) return;
        if (index >= SEQUENCE.length - 1) onDoneRef.current();
        else setIndex((value) => value + 1);
      });
    }, 40);
    return () => {
      dead = true;
      window.clearTimeout(timer);
      timeline.pause();
    };
  }, [index, lang, mode, paused, step]);

  const points = scene >= 7 ? CAIRO : [];

  const skipIntro = () => {
    narrationQueue.stop();
    onSkip();
  };

  const jumpTo = (target: number) => {
    narrationQueue.stop();
    setIndex(target);
  };

  const stepName = (n: number) =>
    t(`intro.scene${n}` as `intro.scene${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`);

  const copyForScene = () => {
    if (scene === 1) {
      return (
        <div className="intro-copy center" style={{ top: '72%' }}>
          <span className="v5-eyebrow">{stepName(1)}</span>
        </div>
      );
    }
    if (scene === 7) {
      return (
        <div className="intro-copy center">
          <span className="v5-eyebrow">07 · {stepName(7)}</span>
          <p className="display-xl" style={{ fontSize: 'clamp(2.25rem,5.4vw,5rem)' }}>
            {t('intro.l5')}
          </p>
        </div>
      );
    }
    if (scene === 8) {
      return (
        <div className="intro-copy">
          <span className="v5-eyebrow">08 · {stepName(8)}</span>
          <p className="display-xl" style={{ fontSize: 'clamp(2.4rem,5.6vw,5.5rem)' }}>
            <span lang="en" dir="ltr">
              Earth Listens
            </span>
            <br />
            <span className="em" lang="en" dir="ltr" style={{ fontSize: '.62em' }}>
              Listen to the Earth&apos;s story.
            </span>
          </p>
          {step.id === 'C7' ? (
            <p
              className="v5-lead"
              style={{ fontSize: 'clamp(1.25rem,2vw,1.75rem)', color: 'var(--color-ink)' }}
            >
              {t('intro.l7')}
            </p>
          ) : null}
        </div>
      );
    }
    if (scene === 6) {
      return (
        <div className="intro-copy" style={{ maxWidth: 'min(520px,40vw)' }}>
          <span className="v5-eyebrow">06 · {stepName(6)}</span>
          <p className="display" style={{ fontSize: 'clamp(1.75rem,3.2vw,3rem)' }}>
            {t('intro.l4')}
          </p>
          <div className="legend4">
            <span>
              <b className="text-gold">↑</b>
              {t('intro.legendPitch')}
            </span>
            <span>
              <b className="text-gold">♩♩♩</b>
              {t('intro.legendRhythm')}
            </span>
            <span>
              <b className="text-gold">L·R</b>
              {t('intro.legendPan')}
            </span>
            <span>
              <b className="text-gold">◢</b>
              {t('intro.legendLoud')}
            </span>
          </div>
        </div>
      );
    }
    const id = step.id as 'C2' | 'C3' | 'C4';
    const lines: Record<string, string> = {
      C2: t('intro.l1'),
      C3: t('intro.l2'),
      C4: t('intro.l3'),
      C5: t('intro.l4'),
    };
    if (scene === 5) {
      return (
        <div className="intro-copy" style={{ maxWidth: 'min(520px,40vw)' }}>
          <span className="v5-eyebrow">05 · {stepName(5)}</span>
          <p className="display" style={{ fontSize: 'clamp(1.75rem,3.2vw,3rem)' }}>
            {t('intro.l4')}
          </p>
        </div>
      );
    }
    if (scene === 4) {
      return (
        <div className="intro-copy">
          <span className="v5-eyebrow">04 · {stepName(4)}</span>
          <p className="display" style={{ fontSize: 'clamp(1.75rem,3.4vw,3.25rem)' }}>
            {t('intro.l3')}
          </p>
        </div>
      );
    }
    return (
      <div className="intro-copy">
        <span className="v5-eyebrow">
          {String(scene).padStart(2, '0')} · {stepName(scene)}
        </span>
        <p className="display">
          {step.id === 'C1' ? t('intro.l1') : step.id === 'C2' ? t('intro.l2') : t('intro.l3')}
        </p>
      </div>
    );
  };

  const motionVariants = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 1.06, filter: 'blur(10px)' },
        animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, scale: 0.97, filter: 'blur(6px)' },
      };

  return (
    <section
      data-testid="intro-stage"
      data-intro-cue={step.id}
      data-scene={scene}
      className="intro-stage"
    >
      <div className="stars" aria-hidden="true" />
      <div className="nebula" aria-hidden="true" />
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

      {scene === 1 ? (
        <svg
          className="intro-headphones"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1v-6h3v4ZM3 19a2 2 0 0 0 2 2h1v-6H3v4Z" />
        </svg>
      ) : null}

      {scene === 2 ? (
        <div className="intro-hb" aria-hidden="true">
          <span className="intro-hb-core" />
          <span className="intro-hb-ring intro-hb-ring-1" />
          <span className="intro-hb-ring intro-hb-ring-2" />
          <span className="intro-hb-ring intro-hb-ring-3" />
        </div>
      ) : null}

      {scene === 3 ? <div className="intro-swath" aria-hidden="true" /> : null}

      {scene === 4 ? (
        <>
          <div
            className="intro-orbit"
            aria-hidden="true"
            style={{ width: '56vmin', height: '56vmin', left: '36%', top: '18%' }}
          />
          <div
            className="intro-orbit"
            aria-hidden="true"
            style={{ width: '76vmin', height: '76vmin', left: '24%', top: '6%', opacity: 0.6 }}
          />
          <IntroInstrument id="satellite" playing={!paused} reducedMotion={reduced} />
        </>
      ) : null}

      {scene === 5 ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-6">
          <OverlayStage
            ids={SCENES[5] ?? []}
            lang={locale === 'ar' ? 'ar' : 'en'}
            playing={!paused}
            intensity={0.6}
            reducedMotion={reduced}
          />
        </div>
      ) : null}

      {scene === 6 ? (
        <IntroInstrument id="inst_guitar" playing={!paused} reducedMotion={reduced} />
      ) : null}

      {scene === 7 ? (
        <div aria-hidden="true" className="waves">
          <i style={{ width: 180, height: 180, left: -90, top: -90 }} />
          <i style={{ width: 340, height: 340, left: -170, top: -170, animationDelay: '0.8s' }} />
          <i style={{ width: 520, height: 520, left: -260, top: -260, animationDelay: '1.6s' }} />
        </div>
      ) : null}

      {scene === 8 ? (
        <div className="intro-cairo" aria-hidden="true" style={{ left: '58%', top: '38%' }}>
          Cairo · 30.04, 31.24
        </div>
      ) : null}

      <AnimatePresence mode="sync">
        <motion.div
          key={index}
          initial={motionVariants.initial}
          animate={motionVariants.animate}
          exit={motionVariants.exit}
          transition={{ duration: reduced ? 0.25 : 0.95, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none"
        >
          {copyForScene()}
        </motion.div>
      </AnimatePresence>

      <div className="intro-itop">
        <Link className="intro-brand" href="/" aria-label={t('header.home')}>
          <LogoMark />
          <span>Earth Listens</span>
        </Link>
        <span aria-hidden="true" style={{ flex: 1 }} />
        <span className="intro-chap hidden sm:inline" aria-hidden="true">
          {String(scene).padStart(2, '0')} / 08
        </span>
        <button
          type="button"
          className="hover:bg-space-700 hidden min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium backdrop-blur-md transition-colors sm:inline-flex"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
        >
          {paused ? t('header.resume') : t('header.pause')}
        </button>
        <button
          type="button"
          className="hover:bg-space-700 inline-flex min-h-11 items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-medium backdrop-blur-md transition-colors"
          onClick={skipIntro}
        >
          {t('intro.skip')}
          <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-white/20 px-1.5 font-mono text-[11px]">
            Esc
          </kbd>
        </button>
      </div>

      <nav className="intro-cnav" aria-label={t('intro.chapters')}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <button
            key={n}
            type="button"
            aria-current={n === scene ? 'step' : undefined}
            onClick={() => jumpTo(SEQUENCE.findIndex((entry) => entry.scene === n))}
          >
            <span>{stepName(n)}</span>
            <i aria-hidden="true" />
          </button>
        ))}
      </nav>

      <div className="intro-progress" aria-hidden="true">
        <b style={{ width: `${progress}%` }} />
        {TICKS.map((tick) => (
          <i key={tick} style={{ left: `${tick}%` }} />
        ))}
      </div>
    </section>
  );
}
