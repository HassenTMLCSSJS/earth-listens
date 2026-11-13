'use client';

import dynamic from 'next/dynamic';
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { formatNumber } from '@/core/format';
import { useAppStore } from '@/core/store';
import { spatialize } from '@/modules/sonification';

const EarthCanvas = dynamic(
  () =>
    import('@/components/earth-canvas')
      .then((mod) => mod.EarthCanvas)
      .catch(
        () =>
          function EarthUnavailable() {
            return null;
          },
      ),
  { ssr: false },
);

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

const POSTER = '/textures/earth-day.jpg';

function frameYear(t: number | string): number {
  if (typeof t === 'number') return Math.trunc(t);
  const year = Number(String(t).slice(0, 4));
  return Number.isFinite(year) ? year : Number.NaN;
}

export function GlobeStage() {
  const t = useTranslations('listen');
  const locale = useLocale();
  const forceClassic = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get('globe') === 'gl',
    () => false,
  );
  const view = useAppStore((state) => state.view);
  const dispatch = useAppStore((state) => state.dispatch);
  const mode = useAppStore((state) => state.mode);
  const lang = useAppStore((state) => state.lang);
  const layers = useAppStore((state) => state.layers);
  const catalog = useAppStore((state) => state.catalog);
  const reducedMotion = useAppStore((state) => state.settings.reducedMotion);
  const motion =
    reducedMotion === 'on' ||
    (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduce')
      ? 'reduce'
      : 'full';
  const webgl = useSyncExternalStore(
    () => () => undefined,
    () => webglAvailable(),
    () => false,
  );
  const online = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener('online', onStoreChange);
      window.addEventListener('offline', onStoreChange);
      return () => {
        window.removeEventListener('online', onStoreChange);
        window.removeEventListener('offline', onStoreChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
  const [failed, setFailed] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const playing = useAppStore((state) => state.playback.status) === 'playing';
  const visual = useAppStore((state) => state.visual);
  const cursor = useAppStore((state) => state.time.cursor);
  const active = layers[0] ?? 'temperature';
  const activeLayer = catalog[active];

  const spatial = spatialize(37.5, 22.5, view.lat, view.lon);
  const chosen = useMemo(() => {
    const frames = activeLayer?.data.frames ?? [];
    const real = frames.filter((frame) => frame.sample !== true);
    const pool = real.length > 0 ? real : frames;
    return pool.filter((frame) => frameYear(frame.t) <= cursor).at(-1);
  }, [activeLayer, cursor]);
  const noMap =
    (activeLayer?.data.frames.some((frame) => frame.sample !== true) ?? false) && !chosen;
  const cells = useMemo(() => {
    if (layers.includes('events')) {
      return (catalog.events?.data.markers ?? []).slice(0, 200).map((marker) => ({
        lat: marker.lat,
        lon: marker.lon,
      }));
    }
    if (!layers.includes('wildfire')) return [];
    const all = catalog.wildfire?.data.cells ?? [];
    return all.filter((cell) => cell.t === '2025-08-04').slice(0, 24);
  }, [catalog.events, catalog.wildfire, layers]);

  useEffect(() => {
    if (!forceClassic || !webgl) return;
    let cancelled = false;
    void import('globe.gl')
      .then((mod) => {
        if (cancelled) return;
        const holder = document.getElementById('globe-classic');
        if (!holder) return;
        const Globe = mod.default as unknown as new (el: HTMLElement) => {
          globeImageUrl: (url: string) => unknown;
          width: (n: number) => { height: (n: number) => void };
        };
        const instance = new Globe(holder);
        instance.globeImageUrl(POSTER);
        instance.width(640).height(420);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [forceClassic, webgl]);

  if (mode === 'audio_first') {
    return (
      <p className="sr-only" data-testid="globe" data-pan={spatial.pan.toFixed(6)}>
        {t('summary')}
      </p>
    );
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft')
      dispatch({ type: 'rotate_view', dLon: -15, dLat: 0 }, 'keyboard');
    else if (event.key === 'ArrowRight')
      dispatch({ type: 'rotate_view', dLon: 15, dLat: 0 }, 'keyboard');
    else if (event.key === 'ArrowUp')
      dispatch({ type: 'rotate_view', dLon: 0, dLat: 15 }, 'keyboard');
    else if (event.key === 'ArrowDown')
      dispatch({ type: 'rotate_view', dLon: 0, dLat: -15 }, 'keyboard');
    else if (event.key === 'Home') dispatch({ type: 'set_view', lat: 0, lon: 0 }, 'keyboard');
    else return;
    event.preventDefault();
  }

  // Playback opens the shader only while online. An offline demo must not
  // request the Three.js chunk after the network is gone.
  const showCanvas = webgl && !failed && !forceClassic && (engaged || (playing && online));
  const label = `${t('globe')}. ${formatNumber(view.lat, lang, { maximumFractionDigits: 1 })}°, ${formatNumber(view.lon, lang, { maximumFractionDigits: 1 })}°`;

  return (
    // The brief requires a focusable application widget, not a generic button.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      data-testid="globe"
      role="application"
      aria-roledescription="interactive globe"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      data-pan={spatial.pan.toFixed(6)}
      onKeyDown={onKey}
      onPointerEnter={() => setEngaged(true)}
      onFocus={() => setEngaged(true)}
      className="bg-space-950 relative h-[420px] overflow-hidden rounded-[2rem] border border-white/10 outline-none"
    >
      {showCanvas ? (
        <Suspense fallback={<p className="p-6 text-sm">{t('summary')}</p>}>
          <EarthCanvas
            texture="/textures/earth-day.webp"
            night="/textures/earth-night.webp"
            height="/textures/earth-height.png"
            {...(active === 'ocean_sst'
              ? {
                  water: '/textures/earth-water-mask.png',
                  overlay: chosen?.value ?? '/frames/ocean_sst/2024-08-15.value.png',
                  ramp: '/ramps/sst.png',
                }
              : chosen?.value
                ? { overlay: chosen.value }
                : {})}
            lat={view.lat}
            lon={view.lon}
            playheadLon={visual.playheadLon}
            cells={cells}
            level={visual.level}
            pulseId={visual.pulse}
            layerId={active}
            motion={motion ?? 'full'}
          />
        </Suspense>
      ) : (
        <img
          src={POSTER}
          alt={label}
          width={960}
          height={420}
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
      )}
      {chosen ? (
        <img
          src={chosen.src}
          alt=""
          width={960}
          height={420}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-screen"
        />
      ) : null}
      <div id="globe-classic" className="absolute inset-0" hidden={!forceClassic} />
      <p className="bg-space-950/80 absolute inset-x-0 bottom-0 grid gap-1 p-3 text-sm">
        <span>{t('summary')}</span>
        <span data-testid="layer-legend">
          {activeLayer?.config.title[locale === 'ar' ? 'ar' : 'en']} ·{' '}
          {activeLayer?.config.unit[locale === 'ar' ? 'ar' : 'en']}
        </span>
        {noMap ? (
          <span>{locale === 'ar' ? 'لا توجد خريطة لهذه السنة.' : 'No map for this year.'}</span>
        ) : null}
        {active === 'air_quality' ? (
          <span>
            {locale === 'ar'
              ? 'محطات OpenAQ تحتاج مفتاحًا. نموذج القاهرة من Open-Meteo. GEOS-CF نموذج وليس مؤشر جودة هواء.'
              : 'OpenAQ stations need a key. Cairo’s live model is Open-Meteo. GEOS-CF is a model, not an AQI.'}
          </span>
        ) : null}
        <span>{t('standIn')}</span>
      </p>
    </div>
  );
}
