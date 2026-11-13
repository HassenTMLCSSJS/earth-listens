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
import { useTranslations } from 'next-intl';
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

export function GlobeStage() {
  const t = useTranslations('listen');
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

  const spatial = spatialize(37.5, 22.5, view.lat, view.lon);
  const frame =
    catalog[layers[0] ?? 'temperature']?.data.frames.at(-1)?.src ?? '/frames/temperature/2025.webp';
  const cells = useMemo(() => {
    if (!layers.includes('wildfire')) return [];
    const all = catalog.wildfire?.data.cells ?? [];
    return all.filter((cell) => cell.t === '2025-08-04').slice(0, 24);
  }, [catalog.wildfire, layers]);

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
            texture={POSTER}
            lat={view.lat}
            lon={view.lon}
            cells={cells}
            level={visual.level}
            pulseId={visual.pulse}
            layerId={visual.layerId}
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
      <img
        src={frame}
        alt=""
        width={960}
        height={420}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-screen"
      />
      <div id="globe-classic" className="absolute inset-0" hidden={!forceClassic} />
      <p className="bg-space-950/80 absolute inset-x-0 bottom-0 grid gap-1 p-3 text-sm">
        <span>{t('summary')}</span>
        <span>{t('standIn')}</span>
      </p>
    </div>
  );
}
