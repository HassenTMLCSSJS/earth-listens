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
import { viewForLayer, LAYER_SOUND } from '@/modules/globe';
import { spatialize } from '@/modules/sonification';
import { speakNarration, type NarrationId } from '@/modules/narration';

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

const EarthGlobe = dynamic(
  () => import('@/components/globe/earth-globe').then((mod) => mod.EarthGlobe),
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
  const globeQuery = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get('globe'),
    () => null,
  );
  const forceClassic = globeQuery === 'gl';
  const forceR3f = globeQuery === 'r3f';
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Mount the globe only after hydration so the server poster matches the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
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
  const [globeReady, setGlobeReady] = useState(false);
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

  const globeView = useMemo(() => {
    const data = activeLayer?.data;
    return viewForLayer({
      id: active,
      cursor,
      series: data?.series ?? {},
      ...(data?.markers ? { markers: data.markers } : {}),
      ...(data?.cells ? { cells: data.cells } : {}),
      focus: view,
    });
  }, [active, activeLayer, cursor, view]);

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

  useEffect(() => {
    void speakNarration(`view.${active}` as NarrationId, locale === 'ar' ? 'ar' : 'en');
  }, [active, locale]);

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

  // The react-globe.gl instance mounts as soon as WebGL exists. The poster
  // covers it until the first frame, and stays up when WebGL is missing.
  const showR3f = webgl && !failed && forceR3f && (engaged || (playing && online));
  const showReact = mounted && webgl && !failed && !forceClassic && !forceR3f;
  const posterVisible = !showR3f && (!showReact || !globeReady);
  const label = `${t('globe')}. ${formatNumber(view.lat, lang, { maximumFractionDigits: 1 })}°, ${formatNumber(view.lon, lang, { maximumFractionDigits: 1 })}°`;

  return (
    // The brief requires a focusable application widget, not a generic button.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      data-testid="globe"
      role="application"
      aria-roledescription={locale === 'ar' ? 'كرة أرضية تفاعلية' : 'interactive globe'}
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      data-pan={spatial.pan.toFixed(6)}
      data-mode={mode}
      onKeyDown={onKey}
      onPointerEnter={() => setEngaged(true)}
      onFocus={() => setEngaged(true)}
      className="bg-space-950 relative flex flex-col overflow-hidden rounded-[2rem] border border-white/10 outline-none"
    >
      <div className="relative h-[min(60svh,420px)] w-full shrink-0">
        {showReact ? (
          <EarthGlobe
            lat={view.lat}
            lon={view.lon}
            points={globeView.points}
            arcs={globeView.arcs}
            reducedMotion={motion === 'reduce'}
            framing="stage"
            playing={playing}
            onReady={() => setGlobeReady(true)}
          />
        ) : showR3f ? (
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
        ) : null}
        {posterVisible ? (
          <img
            src={POSTER}
            alt={showReact ? '' : label}
            width={960}
            height={420}
            fetchPriority="high"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
          />
        ) : null}
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
      </div>
      {/* Below 640 px the legend sits after the canvas so it never covers the
          globe; from 640 px up it overlays the bottom of the stage. */}
      <div className="sm:bg-space-950/80 grid gap-1 border-t border-white/10 p-3 text-sm sm:absolute sm:inset-x-0 sm:bottom-0 sm:z-20 sm:border-t-0">
        <p className="sr-only">{t('summary')}</p>
        <span data-testid="layer-legend">
          {activeLayer?.config.title[locale === 'ar' ? 'ar' : 'en']} ·{' '}
          {activeLayer?.config.unit[locale === 'ar' ? 'ar' : 'en']}
        </span>
        <span>{locale === 'ar' ? LAYER_SOUND[active].ar : LAYER_SOUND[active].en}</span>
        {noMap ? (
          <span>
            {locale === 'ar' ? 'مفيش خريطة للسنة دي. بس الصوت شغّال.' : 'No map for this year.'}
          </span>
        ) : null}
        {active === 'air_quality' ? (
          <span>
            {locale === 'ar'
              ? 'محطات OpenAQ محتاجة مفتاح. موديل القاهرة من Open-Meteo. GEOS-CF موديل مش مؤشر جودة هوا.'
              : 'OpenAQ stations need a key. Cairo’s live model is Open-Meteo. GEOS-CF is a model, not an AQI.'}
          </span>
        ) : null}
        <span>{t('standIn')}</span>
      </div>
    </div>
  );
}
