'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LAYER_IDS, SCALE_IDS } from '@/core/actions';
import { useAppStore } from '@/core/store';
import { COMMAND_TABLE } from '@/modules/agent';
import { SHORTCUTS } from '@/modules/a11y';
import { EARCONS, getPlayer, unlockAudio } from '@/modules/sonification';
import { SettingSwitch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const STEPS = [
  'Set FIRMS_MAP_KEY and run python -m earth_pipeline.fetch --layer <id>. Files land in pipeline/raw/ with raw/manifest.json.',
  'Clean and aggregate with python -m earth_pipeline.build --layer <id> (parse, clean, aggregate).',
  'Review the printed range, then edit public/data/layers/<id>.config.json variables.*.range and register. Schema: LayerConfigSchema.',
  'Export public/data/layers/<id>.json with sample false, retrieved, and sha256. Schema: LayerDataSchema.',
  'Point public/data/registry.json at that file instead of the .sample.json. Schema: RegistrySchema.',
  'Run pnpm data:validate && pnpm test. Update the score snapshot on purpose with vitest -u and explain why.',
  'Put WebP frames in public/frames/<id>/<t>.webp and update frames[].',
  'Run python -m earth_pipeline.validate and commit the plots to docs/validation/.',
  'Regenerate quiz truth with pnpm data:quiz and explanations with pnpm data:explanations.',
  'Add narration MP3s and set status to recorded in public/audio/narration/manifest.json.',
];

export function SoundsPage() {
  const t = useTranslations();
  const dispatch = useAppStore((state) => state.dispatch);
  const catalog = useAppStore((state) => state.catalog);
  const rows = useMemo(() => {
    const series = catalog.temperature?.data.series.global ?? [];
    return series.filter((point) => typeof point.t === 'number' && Number(point.t) % 20 === 0);
  }, [catalog.temperature]);
  return (
    <article className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
      <h1 className="display text-5xl">{t('sounds.title')}</h1>
      <p>{t('sounds.lead')}</p>
      <svg
        viewBox="0 0 200 80"
        role="img"
        aria-label={t('sounds.table')}
        className="bg-space-900 w-full rounded-2xl"
      >
        {rows.map((point, index) => (
          <rect
            key={String(point.t)}
            x={index * 24 + 8}
            y={70 - Math.max(4, ((point.v ?? 0) + 0.6) * 30)}
            width="12"
            height={Math.max(4, ((point.v ?? 0) + 0.6) * 30)}
            fill="#5ad1ff"
          />
        ))}
      </svg>
      <table className="w-full text-sm">
        <caption>{t('sounds.table')}</caption>
        <tbody>
          {rows.map((point) => (
            <tr key={String(point.t)}>
              <th scope="row">{point.t}</th>
              <td>{point.v ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2">
        <Button
          onClick={() => {
            unlockAudio();
            dispatch({ type: 'select_phenomenon', id: 'temperature' }, 'pointer');
            dispatch({ type: 'compare_times', a: 1880, b: 2020 }, 'pointer');
          }}
        >
          {t('sounds.low')}
        </Button>
        <Button
          onClick={() => {
            unlockAudio();
            dispatch({ type: 'select_phenomenon', id: 'temperature' }, 'pointer');
            dispatch({ type: 'set_time', from: 2024 }, 'pointer');
            dispatch({ type: 'play' }, 'pointer');
          }}
        >
          {t('sounds.high')}
        </Button>
      </div>
    </article>
  );
}

export function GuidePage() {
  const t = useTranslations();
  const locale = useAppStore((state) => state.lang);
  return (
    <article className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <h1 className="display text-5xl">{t('guide.title')}</h1>
      <p>{t('guide.esl')}</p>
      <h2>{t('guide.commands')}</h2>
      <ul className="grid gap-2">
        {COMMAND_TABLE.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.id}</strong> — {entry.en.join(', ')} / {entry.ar.join('، ')}
          </li>
        ))}
      </ul>
      <h2>{t('guide.shortcuts')}</h2>
      <ul className="grid gap-2">
        {SHORTCUTS.map((item) => (
          <li key={item.id}>
            <kbd>{item.keys}</kbd> {locale === 'ar' ? item.ar : item.en}
          </li>
        ))}
      </ul>
      <h2>{t('guide.legend')}</h2>
      <div className="flex flex-wrap gap-2">
        {Object.values(EARCONS).map((earcon) => (
          <button
            key={earcon.id}
            type="button"
            className="min-h-11 rounded-full border border-white/20 px-4"
            onClick={() => {
              unlockAudio();
              void getPlayer()
                .init()
                .then(() => getPlayer().earcon(earcon.id));
            }}
          >
            {earcon.id}
          </button>
        ))}
      </div>
      <h2>{t('guide.sources')}</h2>
      <ul>
        <li>
          <a href="https://earth.gov/sealevel/vital-signs/global-temperature/">
            Global temperature
          </a>
        </li>
        <li>
          <a href="https://earth.gov/sealevel/vital-signs/carbon-dioxide/">Carbon dioxide</a>
        </li>
        <li>
          <a href="https://earth.gov/themes/wildfires">Wildfires</a>
        </li>
        <li>
          <a href="https://svs.gsfc.nasa.gov/5113/">NASA SVS 5113</a>
        </li>
      </ul>
      <p>
        {LAYER_IDS.join(', ')} · {SCALE_IDS.length}
      </p>
    </article>
  );
}

export function DataPage() {
  const t = useTranslations();
  const [sources, setSources] = useState<
    { id: string; name: string; url: string; license: string; usedFor: string; key: string }[]
  >([]);
  useEffect(() => {
    void fetch('/data/sources.json')
      .then((response) => response.json())
      .then((body: { sources: typeof sources }) => setSources(body.sources))
      .catch(() => setSources([]));
  }, []);
  return (
    <article className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
      <h1 className="display text-5xl">{t('data.title')}</h1>
      <p>{t('data.lead')}</p>
      <p>{t('banner.sample')}</p>
      <h2>{t('data.steps')}</h2>
      <ol className="grid list-decimal gap-2 ps-5">
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <h2>Attribution</h2>
      <p>
        We acknowledge the use of data and imagery from LANCE FIRMS operated by NASA&apos;s Earth
        Science Data and Information System (ESDIS) with funding provided by NASA Headquarters.
      </p>
      <p>
        GISTEMP Team, NASA Goddard Institute for Space Studies. NOAA GML Mauna Loa: Lan, Tans and
        Thoning. NSIDC Sea Ice Index v4 (Fetterer et al.; verify the DOI before citing it). NASA SVS
        5113. The globe day texture is NASA Blue Marble Next Generation from GIBS. Relief is NOAA
        ETOPO 2022. Night brightness is an image-derived index, not calibrated radiance.
      </p>
      <h2>Sources</h2>
      <table className="w-full text-sm">
        <caption>Every source used or kept for this build, with its license.</caption>
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Used for</th>
            <th scope="col">Key</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id}>
              <td>
                <a href={source.url}>{source.name}</a>
                <span className="block text-xs">{source.license}</span>
              </td>
              <td>{source.usedFor}</td>
              <td>{source.key}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p lang="en">{t('banner.nasa')}</p>
      <p>{t('data.validation')}</p>
      <p>
        <a href="https://github.com/HassenTMLCSSJS/earth-listens/actions">CI</a>
      </p>
    </article>
  );
}

export function SettingsPage() {
  const t = useTranslations('settings');
  const settings = useAppStore((state) => state.settings);
  const dispatch = useAppStore((state) => state.dispatch);
  const markIntroSeen = useAppStore((state) => state.markIntroSeen);
  return (
    <article className="mx-auto grid max-w-xl gap-4 px-4 py-8">
      <h1 className="display text-5xl">{t('title')}</h1>
      <label>
        {t('rate')}
        <input
          className="w-full"
          type="range"
          min={0.75}
          max={1.5}
          step={0.05}
          value={settings.speechRate}
          onChange={(event) =>
            dispatch(
              { type: 'set_setting', key: 'speechRate', value: Number(event.target.value) },
              'pointer',
            )
          }
        />
      </label>
      <label>
        {t('volume')}
        <input
          className="w-full"
          type="range"
          min={-40}
          max={0}
          step={1}
          value={settings.masterVolumeDb}
          onChange={(event) =>
            dispatch(
              { type: 'set_setting', key: 'masterVolumeDb', value: Number(event.target.value) },
              'pointer',
            )
          }
        />
      </label>
      <SettingSwitch
        label={t('contrast')}
        checked={settings.highContrast}
        onCheckedChange={(value) =>
          dispatch({ type: 'set_setting', key: 'highContrast', value }, 'pointer')
        }
      />
      <label>
        {t('motion')}
        <select
          className="bg-space-950 mt-1 min-h-11 w-full rounded-full border border-white/20 px-4"
          value={settings.reducedMotion}
          onChange={(event) =>
            dispatch(
              {
                type: 'set_setting',
                key: 'reducedMotion',
                value: event.target.value as 'system' | 'on' | 'off',
              },
              'pointer',
            )
          }
        >
          <option value="system">{t('system')}</option>
          <option value="on">{t('on')}</option>
          <option value="off">{t('off')}</option>
        </select>
      </label>
      <label>
        {t('texture')}
        <select
          className="bg-space-950 mt-1 min-h-11 w-full rounded-full border border-white/20 px-4"
          value={settings.textureQuality}
          onChange={(event) =>
            dispatch(
              {
                type: 'set_setting',
                key: 'textureQuality',
                value: event.target.value as 'auto' | '4k' | '8k',
              },
              'pointer',
            )
          }
        >
          <option value="auto">{t('textureAuto')}</option>
          <option value="4k">{t('texture4k')}</option>
          <option value="8k">{t('texture8k')}</option>
        </select>
      </label>
      <SettingSwitch
        label={t('sr')}
        checked={settings.screenReaderMode}
        onCheckedChange={(value) =>
          dispatch({ type: 'set_setting', key: 'screenReaderMode', value }, 'pointer')
        }
      />
      <SettingSwitch
        label={t('captions')}
        checked={settings.captions}
        onCheckedChange={(value) =>
          dispatch({ type: 'set_setting', key: 'captions', value }, 'pointer')
        }
      />
      <Button onClick={() => markIntroSeen(false)}>{t('replay')}</Button>
    </article>
  );
}
