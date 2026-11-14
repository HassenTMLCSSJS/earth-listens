'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Eye, Globe2, Play, RotateCcw, Search, Volume2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { LAYER_IDS, type LayerId, type SettingKey, type Settings } from '@/core/actions';
import { DEFAULT_SETTINGS, scoreFor, useAppStore } from '@/core/store';
import { useRouter } from '@/i18n/navigation';
import { SHORTCUTS } from '@/modules/a11y';
import { GUIDE_LAYERS, LAYER_SOUND, LAYER_SOURCE } from '@/modules/globe';
import { getPlayer, unlockAudio } from '@/modules/sonification';
import { LangToggle } from '@/components/site-header/lang-toggle';
import { SettingSwitch } from '@/components/setting-switch';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { LayerSwatch } from '@/components/ui/layer-swatch';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const locale = useLocale();
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
      <ul className="grid gap-2">
        {LAYER_IDS.map((id) => (
          <li key={id}>
            <strong>{t(`layers.${id}`)}. </strong>
            {locale === 'ar' ? LAYER_SOUND[id].ar : LAYER_SOUND[id].en}
          </li>
        ))}
      </ul>
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
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const needle = query.trim().toLowerCase();

  const commands = useMemo(
    () =>
      [1, 2, 3, 4, 5, 6, 7].map((step, index) => ({
        key: ['Space', '→', 'C', '2', '← →', '?', 'Q'][index] ?? '',
        say: t(`tutorial.s${step}.say`),
      })),
    [t],
  );

  const legend = useMemo(() => GUIDE_LAYERS.map((id) => ({ id, label: t(`layers.${id}`) })), [t]);

  const sources = useMemo(
    () => GUIDE_LAYERS.map((id) => ({ id, label: t(`layers.${id}`), source: LAYER_SOURCE[id] })),
    [t],
  );

  const match = (value: string) => !needle || value.toLowerCase().includes(needle);
  const shownCommands = commands.filter((row) => match(row.say));
  const shownShortcuts = SHORTCUTS.filter(
    (item) => match(item.en) || match(item.ar) || match(item.keys),
  );
  const shownLegend = legend.filter((row) => match(row.label) || match(t(`instrument.${row.id}`)));
  const shownSources = sources.filter((row) => match(row.label) || match(row.source));

  return (
    <main
      id="content"
      className="relative mx-auto max-w-[1320px] px-[clamp(20px,3.4vw,48px)] pt-[clamp(72px,10vw,130px)] pb-24"
    >
      <div className="relative z-10">
        <span className="v5-eyebrow">{t('nav.learn')}</span>
        <h1 className="v5-h2 text-display mt-2.5">{t('guide.title')}</h1>
        <p className="v5-lead mt-2.5">{t('guide.lead')}</p>
        <label className="panel text-ink-subtle mt-5 flex h-[52px] max-w-[520px] items-center gap-2.5 rounded-full px-[18px]">
          <Search className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          <span className="sr-only">{t('guide.search')}</span>
          <input
            ref={searchRef}
            id="guide-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('guide.search')}
            className="text-ink placeholder:text-ink-subtle min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none"
          />
          <Kbd className="border-line-strong text-ink-muted bg-white/[0.03] font-mono">/</Kbd>
        </label>
      </div>

      <p className="border-gold relative z-10 mt-[18px] rounded-[var(--radius-card)] border-s-[3px] bg-[rgb(242_196_109/.06)] px-[22px] py-[18px] text-[1.0625rem]">
        {t('guide.esl')}
      </p>

      <div className="relative z-10 mt-4 grid gap-3.5 lg:grid-cols-2">
        <section className="v5-card px-5 pb-2">
          <h2 className="v5-h3 py-4">{t('guide.commands')}</h2>
          {shownCommands.map((row) => (
            <div
              key={row.say}
              className="border-line flex min-h-12 items-center justify-between gap-4 border-t text-[0.9375rem]"
            >
              <q className="text-gold-hi">“{row.say}”</q>
              <Kbd className="border-line-strong text-ink-muted bg-white/[0.03] font-mono">
                {row.key}
              </Kbd>
            </div>
          ))}
        </section>

        <section className="v5-card px-5 pb-2">
          <h2 className="v5-h3 py-4">{t('guide.shortcuts')}</h2>
          {shownShortcuts.map((item) => (
            <div
              key={item.id}
              className="border-line flex min-h-12 items-center justify-between gap-4 border-t text-[0.9375rem]"
            >
              <span>{locale === 'ar' ? item.ar : item.en}</span>
              <Kbd
                dir="ltr"
                className="border-line-strong text-ink-muted bg-white/[0.03] font-mono"
              >
                {item.keys}
              </Kbd>
            </div>
          ))}
        </section>

        <section className="v5-card px-5 pb-2">
          <h2 className="v5-h3 py-4">{t('guide.legend')}</h2>
          {shownLegend.map((row) => (
            <div
              key={row.id}
              className="border-line flex min-h-12 items-center justify-between gap-4 border-t text-[0.9375rem]"
            >
              <span className="flex items-center gap-2.5">
                <LayerSwatch id={row.id} size="sm" />
                <span>{row.label}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-ink-subtle text-[0.8125rem]">
                  {t(`instrument.${row.id}`)}
                </span>
                <button
                  type="button"
                  aria-label={`${t('guide.playEarcon')}: ${row.label}`}
                  onClick={() => playLayerSample(row.id)}
                  className="border-line-strong text-ink-muted hover:bg-space-700 hover:text-gold grid size-8 place-items-center rounded-full border transition-colors"
                >
                  <Play className="size-3.5" strokeWidth={2} aria-hidden="true" />
                </button>
              </span>
            </div>
          ))}
        </section>

        <section className="v5-card px-5 pb-2">
          <h2 className="v5-h3 py-4">{t('guide.sources')}</h2>
          {shownSources.map((row) => (
            <div
              key={row.id}
              className="border-line flex min-h-12 items-center justify-between gap-4 border-t text-[0.9375rem]"
            >
              <span>{row.label}</span>
              <span className="text-ink-subtle text-end text-[0.8125rem]">{row.source}</span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function playLayerSample(id: LayerId) {
  unlockAudio();
  const state = useAppStore.getState();
  const score = scoreFor({
    ...state,
    layers: [id],
    playback: { ...state.playback, status: 'playing', mode: 'dwell' },
  });
  const player = getPlayer();
  if (!score || score.events.length === 0) {
    void player.init().then(() => player.earcon('layer_added'));
    return;
  }
  const short = {
    ...score,
    mode: 'dwell' as const,
    events: score.events.slice(0, 3).map((event) => ({ ...event, dur: 0.28 })),
    earcons: [],
    duration: 1,
  };
  void player.init().then(() => player.play(short));
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

function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; className?: string }[];
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="border-line inline-flex items-center gap-0.5 rounded-full border bg-white/[0.03] p-[3px]"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`aria-pressed:bg-ink aria-pressed:text-space-950 text-ink-muted hover:text-ink inline-flex h-8 items-center justify-center rounded-full font-medium transition-colors ${
            compact ? 'min-w-9 px-2' : 'px-3 text-[0.8125rem]'
          } ${option.className ?? ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-line flex min-h-16 flex-wrap items-center justify-between gap-x-5 gap-y-2 border-t py-2.5">
      <span className="text-ink text-[0.9375rem]">{label}</span>
      {children}
    </div>
  );
}

const GROUPS = [
  { id: 'Language', label: 'settings.groupLanguage', Icon: Globe2 },
  { id: 'Sound', label: 'settings.groupSound', Icon: Volume2 },
  { id: 'Visual', label: 'settings.groupVisual', Icon: Eye },
  { id: 'Advanced', label: 'settings.groupAdvanced', Icon: Wrench },
] as const;

export function SettingsPage() {
  const t = useTranslations('settings');
  const common = useTranslations();
  const router = useRouter();
  const settings = useAppStore((state) => state.settings);
  const mode = useAppStore((state) => state.mode);
  const scale = useAppStore((state) => state.scale);
  const tuning = useAppStore((state) => state.tuning);
  const dispatch = useAppStore((state) => state.dispatch);
  const markIntroSeen = useAppStore((state) => state.markIntroSeen);

  const set = <K extends SettingKey>(key: K, value: Settings[K]) =>
    dispatch({ type: 'set_setting', key, value }, 'pointer');
  const save = <K extends SettingKey>(key: K, value: Settings[K]) => {
    set(key, value);
    toast.success(t('saved'), { id: 'settings-saved', duration: 1400 });
  };

  const resetAll = () => {
    useAppStore.setState({ settings: DEFAULT_SETTINGS, tuning: 'microtonal' });
    localStorage.setItem('el.settings.v1', JSON.stringify(DEFAULT_SETTINGS));
    toast.success(t('saved'), { id: 'settings-saved', duration: 1400 });
  };

  return (
    <main
      id="content"
      className="relative mx-auto max-w-[1320px] px-[clamp(20px,3.4vw,48px)] pt-[clamp(72px,10vw,130px)] pb-24"
    >
      <div className="relative z-10">
        <h1 className="display">{t('title')}</h1>
        <p className="v5-lead mt-2.5">{t('lead')}</p>
      </div>

      <div className="relative z-10 mt-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={t('title')} className="hidden self-start lg:sticky lg:top-[100px] lg:grid">
          {GROUPS.map(({ id, label, Icon }, index) => (
            <a
              key={id}
              href={`#${id}`}
              aria-current={index === 0 ? 'true' : undefined}
              className="aria-[current=true]:bg-space-700 text-ink-muted hover:text-ink aria-[current=true]:text-ink flex min-h-11 items-center gap-2.5 rounded-xl px-3.5 transition-colors"
            >
              <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
              <span>{t(label.replace('settings.', ''))}</span>
            </a>
          ))}
        </nav>

        <div className="grid gap-3.5">
          <section id="Language" className="v5-card scroll-mt-28 px-[22px] pb-2">
            <h2 className="font-display pt-4 pb-1 text-lg font-semibold">{t('groupLanguage')}</h2>
            <Row label={t('language')}>
              <LangToggle full />
            </Row>
            <Row label={t('mode')}>
              <Seg
                label={t('mode')}
                value={mode}
                onChange={(value) => {
                  dispatch({ type: 'set_mode', mode: value }, 'pointer');
                  toast.success(t('saved'), { id: 'settings-saved', duration: 1400 });
                }}
                options={[
                  { value: 'audio_first', label: t('modeListening') },
                  { value: 'visual', label: t('modeVisual') },
                ]}
              />
            </Row>
          </section>

          <section id="Sound" className="v5-card scroll-mt-28 px-[22px] pb-2">
            <h2 className="font-display pt-4 pb-1 text-lg font-semibold">{t('groupSound')}</h2>
            <Row label={t('volume')}>
              <span className="flex w-[min(260px,48vw)] items-center gap-3">
                <Slider
                  aria-label={t('volume')}
                  min={-40}
                  max={0}
                  step={1}
                  value={[settings.masterVolumeDb]}
                  onValueChange={([value]) => {
                    if (typeof value === 'number') set('masterVolumeDb', value);
                  }}
                  onValueCommit={() =>
                    toast.success(t('saved'), { id: 'settings-saved', duration: 1400 })
                  }
                />
                <span className="text-ink-subtle w-14 text-end font-mono text-xs">
                  {settings.masterVolumeDb} dB
                </span>
              </span>
            </Row>
            <Row label={t('rate')}>
              <span className="flex w-[min(260px,48vw)] items-center gap-3">
                <Slider
                  aria-label={t('rate')}
                  min={0.7}
                  max={1.4}
                  step={0.05}
                  value={[settings.speechRate]}
                  onValueChange={([value]) => {
                    if (typeof value === 'number') set('speechRate', Number(value.toFixed(2)));
                  }}
                  onValueCommit={() =>
                    toast.success(t('saved'), { id: 'settings-saved', duration: 1400 })
                  }
                />
                <span className="text-ink-subtle w-14 text-end font-mono text-xs">
                  {settings.speechRate.toFixed(2)}×
                </span>
              </span>
            </Row>
            <SettingSwitch
              label={t('earcons')}
              checked={settings.earcons}
              onCheckedChange={(value) => save('earcons', value)}
            />
            <SettingSwitch
              label={t('captions')}
              checked={settings.captions}
              onCheckedChange={(value) => save('captions', value)}
            />
            <SettingSwitch
              label={t('haptics')}
              checked={settings.haptics}
              onCheckedChange={(value) => save('haptics', value)}
            />
            <SettingSwitch
              label={t('spaceToTalk')}
              checked={settings.spaceToTalk}
              onCheckedChange={(value) => save('spaceToTalk', value)}
            />
          </section>

          <section id="Visual" className="v5-card scroll-mt-28 px-[22px] pb-2">
            <h2 className="font-display pt-4 pb-1 text-lg font-semibold">{t('groupVisual')}</h2>
            <SettingSwitch
              label={t('contrast')}
              checked={settings.highContrast}
              onCheckedChange={(value) => save('highContrast', value)}
            />
            <Row label={t('motion')}>
              <Seg
                label={t('motion')}
                value={settings.reducedMotion}
                onChange={(value) => save('reducedMotion', value)}
                options={[
                  { value: 'system', label: t('system') },
                  { value: 'on', label: t('on') },
                  { value: 'off', label: t('off') },
                ]}
              />
            </Row>
            <Row label={t('captionSize')}>
              <Seg
                label={t('captionSize')}
                compact
                value={settings.captionSize}
                onChange={(value) => save('captionSize', value)}
                options={[
                  { value: 'sm', label: 'A', className: 'text-[0.75rem]' },
                  { value: 'md', label: 'A', className: 'text-[0.9375rem]' },
                  { value: 'lg', label: 'A', className: 'text-[1.125rem]' },
                ]}
              />
            </Row>
            <Row label={t('texture')}>
              <Seg
                label={t('texture')}
                value={settings.textureQuality}
                onChange={(value) => save('textureQuality', value)}
                options={[
                  { value: 'auto', label: t('textureAuto') },
                  { value: '4k', label: t('texture4k') },
                  { value: '8k', label: t('texture8k') },
                ]}
              />
            </Row>
          </section>

          <section id="Advanced" className="v5-card scroll-mt-28 px-[22px] pb-4">
            <h2 className="font-display pt-4 pb-1 text-lg font-semibold">{t('groupAdvanced')}</h2>
            <SettingSwitch
              label={t('sr')}
              checked={settings.screenReaderMode}
              onCheckedChange={(value) => save('screenReaderMode', value)}
            />
            <Row label={common('listen.tuning')}>
              <Seg
                label={common('listen.tuning')}
                value={tuning}
                onChange={(value) => {
                  dispatch({ type: 'set_scale', scale, tuning: value }, 'pointer');
                  toast.success(t('saved'), { id: 'settings-saved', duration: 1400 });
                }}
                options={[
                  { value: 'microtonal', label: common('listen.tuningMicro') },
                  { value: 'twelve_tet', label: common('listen.tuningTet') },
                ]}
              />
            </Row>
            <div className="border-line flex flex-wrap items-center gap-2.5 border-t pt-4">
              <Button
                variant="outline"
                className="border-line-strong h-11 rounded-full bg-white/[0.04] px-5"
                onClick={() => {
                  markIntroSeen(false);
                  sessionStorage.setItem('el.replay', '1');
                  router.push('/');
                }}
              >
                <RotateCcw className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
                {t('replay')}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-danger hover:bg-danger/10 hover:text-danger h-11 rounded-full px-5"
                  >
                    {t('reset')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-line bg-space-900 p-6">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-xl">
                      {t('reset')}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-ink-muted">
                      {t('lead')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-line-strong h-11 rounded-full">
                      {common('help.close')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-full"
                      onClick={resetAll}
                    >
                      {t('reset')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
