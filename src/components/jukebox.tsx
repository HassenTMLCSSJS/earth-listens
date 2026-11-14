'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import * as Slider from '@radix-ui/react-slider';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import {
  LAYER_IDS,
  SCALE_IDS,
  SPEEDS,
  type LayerId,
  type ScaleId,
  type Speed,
} from '@/core/actions';
import { formatDegrees, formatYear } from '@/core/format';
import { scoreFor, useAppStore } from '@/core/store';
import { REGIONS, describeFreshness } from '@/modules/data';
import { getPlayer, unlockAudio } from '@/modules/sonification';
import { GlobeStage } from '@/components/globe-stage';

function FreshnessChip({ demo }: { demo: boolean }) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (demo || new URLSearchParams(window.location.search).get('demo') === '1') return;
    let cancel = false;
    void fetch('/api/live/gistemp')
      .then(async (response) => {
        if (!response.ok) throw new Error('live');
        return response.json();
      })
      .then((body) => {
        if (!cancel) setText(describeFreshness(body, 'en'));
      })
      .catch(() => {
        if (!cancel) setText('Cached snapshot');
      });
    return () => {
      cancel = true;
    };
  }, [demo]);
  return (
    <p data-testid="freshness" aria-live="polite">
      {demo ? 'Demo data' : text}
    </p>
  );
}
import { Button } from '@/components/ui/button';

export function Jukebox({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations();
  const dispatch = useAppStore((state) => state.dispatch);
  const layers = useAppStore((state) => state.layers);
  const region = useAppStore((state) => state.region);
  const time = useAppStore((state) => state.time);
  const playback = useAppStore((state) => state.playback);
  const scale = useAppStore((state) => state.scale);
  const tuning = useAppStore((state) => state.tuning);
  const catalog = useAppStore((state) => state.catalog);
  const lang = useAppStore((state) => state.lang);
  const mode = useAppStore((state) => state.mode);
  const debug = useAppStore((state) => state.debug);
  const demo = useAppStore((state) => state.demo);
  const score = useAppStore((state) => state.lastScore);
  const [previewYear, setPreviewYear] = useState<number | null>(null);

  const bounds = useMemo(() => {
    const primary = catalog[layers[0] ?? 'temperature'];
    const series = primary?.data.series[region] ?? primary?.data.series.global ?? [];
    const years = series.flatMap((point) => (typeof point.t === 'number' ? [point.t] : []));
    if (years.length === 0) return { min: time.from, max: time.to, series };
    return { min: Math.min(...years), max: Math.max(...years), series };
  }, [catalog, layers, region, time.from, time.to]);

  const cursorPoint = bounds.series.find((point) => point.t === time.cursor);
  const valueText =
    cursorPoint?.v == null
      ? formatYear(time.cursor, lang)
      : `${formatYear(time.cursor, lang)}, ${formatDegrees(cursorPoint.v, lang)}`;

  useEffect(() => {
    if (previewYear === null || playback.status !== 'idle') return;
    const timer = window.setTimeout(() => {
      const state = useAppStore.getState();
      const next = scoreFor({
        ...state,
        time: { ...state.time, cursor: previewYear },
        playback: { ...state.playback, status: 'playing', mode: 'dwell' },
      });
      if (!next) return;
      const short = {
        ...next,
        events: next.events.slice(0, 1).map((event) => ({ ...event, dur: 0.3 })),
        earcons: [],
        duration: 0.3,
      };
      unlockAudio();
      void getPlayer()
        .init()
        .then(() => getPlayer().play(short));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [previewYear, playback.status]);

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8">
      {embedded ? (
        <h2 className="display text-4xl">{t('listen.title')}</h2>
      ) : (
        <h1 className="display text-5xl">{t('listen.title')}</h1>
      )}
      <div
        className={mode === 'audio_first' ? 'grid gap-6' : 'grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'}
      >
        <GlobeStage />
        <div className="panel grid gap-5 p-5">
          <fieldset>
            <legend>{t('listen.what')}</legend>
            <ToggleGroup.Root
              type="multiple"
              className="mt-2 flex flex-wrap gap-2"
              value={layers}
              aria-label={t('listen.what')}
              onValueChange={(value) => {
                const ids = value
                  .filter((id): id is LayerId => LAYER_IDS.includes(id as LayerId))
                  .slice(0, 4);
                const only = ids[0];
                if (!only) return;
                if (ids.length === 1) dispatch({ type: 'select_phenomenon', id: only }, 'pointer');
                else dispatch({ type: 'combine_layers', ids }, 'pointer');
              }}
            >
              {LAYER_IDS.map((id) => (
                <ToggleGroup.Item
                  key={id}
                  value={id}
                  className="data-[state=on]:bg-accent data-[state=on]:text-space-950 min-h-11 rounded-full border border-white/20 px-4"
                >
                  {t(`layers.${id}`)}
                </ToggleGroup.Item>
              ))}
            </ToggleGroup.Root>
          </fieldset>
          {layers[0] === 'night_lights' ? (
            <Button
              onClick={() => {
                dispatch({ type: 'compare_times', a: 2012, b: 2016 }, 'pointer');
                dispatch({ type: 'play' }, 'pointer');
              }}
            >
              {t('listen.compare')}
            </Button>
          ) : null}
          <FreshnessChip demo={demo} />
          <label>
            {t('listen.where')}
            <select
              className="bg-space-950 mt-1 min-h-11 w-full rounded-full border border-white/20 px-4"
              value={region}
              onChange={(event) =>
                dispatch(
                  { type: 'set_region', region: event.target.value as typeof region },
                  'pointer',
                )
              }
            >
              {REGIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(`regions.${item.id}`)}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p id="when-label">{t('listen.when')}</p>
            <p id="when-value">{valueText}</p>
            <Slider.Root
              className="relative mt-4 flex h-11 items-center"
              min={bounds.min}
              max={bounds.max}
              step={1}
              value={[Math.min(time.from, time.to), Math.max(time.from, time.to)]}
              aria-label={t('listen.when')}
              onValueChange={(value) => {
                const from = value[0];
                const to = value[1];
                if (from === undefined || to === undefined) return;
                dispatch({ type: 'set_time', from, to }, 'pointer');
                setPreviewYear(from);
              }}
            >
              <Slider.Track className="relative h-2 grow rounded-full bg-white/15">
                <Slider.Range className="bg-accent absolute h-full rounded-full" />
              </Slider.Track>
              <Slider.Thumb
                aria-label={t('listen.when')}
                aria-describedby="when-value"
                className="bg-ink block h-6 w-6 rounded-full"
              />
              <Slider.Thumb
                aria-label={t('listen.when')}
                aria-describedby="when-value"
                className="bg-warm block h-6 w-6 rounded-full"
              />
            </Slider.Root>
            <label className="mt-4 block">
              {t('listen.year')}
              <Slider.Root
                className="relative mt-2 flex h-11 items-center"
                min={bounds.min}
                max={Math.max(bounds.min + 1, bounds.max)}
                step={1}
                value={[Math.round(time.cursor)]}
                onValueChange={(value) => {
                  const year = value[0];
                  if (year === undefined) return;
                  dispatch({ type: 'set_time', from: year }, 'pointer');
                  setPreviewYear(year);
                }}
              >
                <Slider.Track className="relative h-2 grow rounded-full bg-white/15">
                  <Slider.Range className="bg-warm absolute h-full rounded-full" />
                </Slider.Track>
                <Slider.Thumb
                  aria-label={t('listen.year')}
                  className="bg-focus block h-6 w-6 rounded-full"
                />
              </Slider.Root>
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                unlockAudio();
                dispatch({ type: 'play' }, 'pointer');
              }}
            >
              {t('listen.listen')}
            </Button>
            <button
              type="button"
              className="min-h-11 rounded-full border border-white/20 px-4"
              onClick={() => {
                getPlayer().stop();
                dispatch({ type: 'stop' }, 'pointer');
              }}
            >
              {t('listen.stop')}
            </button>
          </div>
          <fieldset>
            <legend>{t('listen.speed')}</legend>
            <div className="mt-2 flex gap-2">
              {SPEEDS.map((speed) => (
                <button
                  key={speed}
                  type="button"
                  aria-pressed={playback.speed === speed}
                  className="min-h-11 rounded-full border border-white/20 px-4"
                  onClick={() => dispatch({ type: 'play', speed: speed as Speed }, 'pointer')}
                >
                  {t(`speeds.${speed}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            {t('listen.scale')}
            <select
              className="bg-space-950 mt-1 min-h-11 w-full rounded-full border border-white/20 px-4"
              value={scale}
              onChange={(event) =>
                dispatch(
                  { type: 'set_scale', scale: event.target.value as ScaleId, tuning },
                  'pointer',
                )
              }
            >
              {SCALE_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(`scales.${id}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={tuning === 'twelve_tet'}
              onChange={(event) =>
                dispatch(
                  {
                    type: 'set_scale',
                    scale,
                    tuning: event.target.checked ? 'twelve_tet' : 'microtonal',
                  },
                  'pointer',
                )
              }
            />
            {t('listen.tuning')}
          </label>
          <p data-testid="playback-mode">{playback.mode}</p>
          <p data-testid="region-value" data-region={region}>
            {t(`regions.${region}`)}
          </p>
          <p className="sr-only" data-testid="score-events">
            {score?.events.length ?? 0}
          </p>
          {debug ? (
            <pre className="sr-only" data-testid="score-debug">
              {JSON.stringify(score?.events.slice(-50) ?? [])}
            </pre>
          ) : null}
        </div>
      </div>
      <p lang="en">{t('banner.nasa')}</p>
    </section>
  );
}
