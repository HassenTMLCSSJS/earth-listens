'use client';

import { create } from 'zustand';
import {
  parseAction,
  type Action,
  type Lang,
  type LayerId,
  type Mode,
  type Origin,
  type RegionId,
  type ScaleId,
  type Settings,
  type Speed,
  type TuningMode,
} from '@/core/actions';
import { emit } from '@/core/bus';
import { formatIsoDate, formatYear } from '@/core/format';
import { REGIONS, regionCentre } from '@/modules/data';
import { announce } from '@/modules/narration';
import {
  SYMPHONY_LAYERS,
  buildScore,
  clampMasterDb,
  type Score,
  type ScoreInput,
  type ScoreLayerConfig,
  type VariableSpec,
} from '@/modules/sonification';
import type { LayerConfig, LoadedLayer } from '@/modules/data';

export interface QuizSlice {
  open: boolean;
}

export interface AppData {
  lang: Lang;
  mode: Mode;
  demo: boolean;
  debug: boolean;
  layers: LayerId[];
  region: RegionId;
  time: { from: number; to: number; cursor: number };
  view: { lat: number; lon: number };
  playback: {
    status: 'idle' | 'playing' | 'paused';
    speed: Speed;
    compare?: { a: number; b: number };
    mode: Score['mode'] | 'idle';
  };
  scale: ScaleId;
  tuning: TuningMode;
  quiz: QuizSlice | null;
  tutorial: { stepId: string | null; index: number };
  settings: Settings;
  introSeen: boolean;
  introNonce: number;
  /** True once the entry experience reaches the hub, so the chrome can appear. */
  hub: boolean;
  sample: boolean;
  catalog: Partial<Record<LayerId, LoadedLayer>>;
  lastScore: Score | null;
  message: { en: string; ar: string } | null;
  visual: { level: number; pulse: number; layerId: LayerId; playheadLon: number };
}

export const DEFAULT_SETTINGS: Settings = {
  speechRate: 1,
  masterVolumeDb: -12,
  highContrast: false,
  reducedMotion: 'system',
  screenReaderMode: false,
  captions: true,
  earcons: true,
  haptics: true,
  spaceToTalk: false,
  captionSize: 'md',
  textureQuality: 'auto',
};

export const initialAppData = (): AppData => ({
  lang: 'en',
  mode: 'visual',
  demo: false,
  debug: false,
  layers: ['temperature'],
  region: 'global',
  time: { from: 1880, to: 2025, cursor: 1880 },
  view: { lat: 0, lon: 0 },
  playback: { status: 'idle', speed: 'normal', mode: 'idle' },
  scale: 'pentatonic_major',
  tuning: 'microtonal',
  quiz: null,
  tutorial: { stepId: null, index: 0 },
  settings: DEFAULT_SETTINGS,
  introSeen: false,
  introNonce: 0,
  hub: false,
  sample: true,
  catalog: {},
  lastScore: null,
  message: null,
  visual: { level: 0, pulse: 0, layerId: 'temperature', playheadLon: 31 },
});

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function wrapLon(lon: number): number {
  let value = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (Object.is(value, -0)) value = 0;
  return value;
}

function layerBounds(data: AppData): { min: number; max: number } {
  const primary = data.catalog[data.layers[0] ?? 'temperature'];
  const series =
    primary?.data.series[data.region] ??
    primary?.data.series.global ??
    Object.values(primary?.data.series ?? {}).find((points) => points !== undefined) ??
    [];
  const times = series.flatMap((point) => (typeof point.t === 'number' ? [point.t] : []));
  if (times.length === 0) return primary?.data.range ?? { min: 1880, max: 2025 };
  return { min: Math.min(...times), max: Math.max(...times) };
}

function sampleFor(layers: LayerId[], catalog: Partial<Record<LayerId, LoadedLayer>>): boolean {
  return layers.some((id) => catalog[id]?.isSample === true);
}

function applySetting(
  settings: Settings,
  key: keyof Settings,
  value: Settings[keyof Settings],
): Settings {
  if (key === 'speechRate' && typeof value === 'number')
    return { ...settings, speechRate: clamp(value, 0.7, 1.4) };
  if (key === 'masterVolumeDb' && typeof value === 'number')
    return { ...settings, masterVolumeDb: clampMasterDb(value) };
  if (key === 'highContrast' && typeof value === 'boolean')
    return { ...settings, highContrast: value };
  if (key === 'reducedMotion' && (value === 'system' || value === 'on' || value === 'off'))
    return { ...settings, reducedMotion: value };
  if (key === 'screenReaderMode' && typeof value === 'boolean')
    return { ...settings, screenReaderMode: value };
  if (key === 'captions' && typeof value === 'boolean') return { ...settings, captions: value };
  if (key === 'earcons' && typeof value === 'boolean') return { ...settings, earcons: value };
  if (key === 'haptics' && typeof value === 'boolean') return { ...settings, haptics: value };
  if (key === 'spaceToTalk' && typeof value === 'boolean')
    return { ...settings, spaceToTalk: value };
  if (key === 'captionSize' && (value === 'sm' || value === 'md' || value === 'lg'))
    return { ...settings, captionSize: value };
  if (key === 'textureQuality' && (value === 'auto' || value === '4k' || value === '8k')) {
    return { ...settings, textureQuality: value };
  }
  return settings;
}

export function reduceApp(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'select_phenomenon':
      return {
        ...state,
        layers: [action.id],
        sample: sampleFor([action.id], state.catalog),
        playback: { ...state.playback, status: 'idle', mode: 'idle' },
      };
    case 'combine_layers':
      return {
        ...state,
        layers: action.ids.slice(0, 4),
        sample: sampleFor(action.ids, state.catalog),
        playback: {
          ...state.playback,
          mode: action.ids.length === 4 ? 'symphony' : state.playback.mode,
        },
      };
    case 'set_region':
      return { ...state, region: action.region, view: regionCentre(action.region) };
    case 'set_time': {
      const bounds = layerBounds(state);
      if (action.from !== undefined && action.to !== undefined) {
        const from = clamp(action.from, bounds.min, bounds.max);
        const to = clamp(action.to, bounds.min, bounds.max);
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        return { ...state, time: { from: lo, to: hi, cursor: lo } };
      }
      if (action.from !== undefined) {
        const cursor = clamp(action.from, bounds.min, bounds.max);
        return { ...state, time: { ...state.time, cursor } };
      }
      return state;
    }
    case 'compare_times':
      return {
        ...state,
        playback: {
          ...state.playback,
          status: 'playing',
          mode: 'compare',
          compare: { a: action.a, b: action.b },
        },
      };
    case 'play': {
      const speed = action.speed ?? state.playback.speed;
      const mode =
        state.layers.length === 4 ? 'symphony' : state.playback.compare ? 'compare' : 'sweep';
      return { ...state, playback: { ...state.playback, status: 'playing', speed, mode } };
    }
    case 'stop':
      return { ...state, playback: { status: 'idle', speed: state.playback.speed, mode: 'idle' } };
    case 'pause':
      return { ...state, playback: { ...state.playback, status: 'paused' } };
    case 'navigate':
      return state;
    case 'set_mode':
      return { ...state, mode: action.mode };
    case 'set_language':
      return { ...state, lang: action.lang };
    case 'set_scale':
      return { ...state, scale: action.scale, tuning: action.tuning ?? state.tuning };
    case 'rotate_view':
      return {
        ...state,
        view: {
          lat: clamp(state.view.lat + action.dLat, -75, 75),
          lon: wrapLon(state.view.lon + action.dLon),
        },
      };
    case 'set_view':
      return { ...state, view: { lat: clamp(action.lat, -75, 75), lon: wrapLon(action.lon) } };
    case 'start_quiz':
      return { ...state, quiz: { open: true } };
    case 'set_setting':
      return { ...state, settings: applySetting(state.settings, action.key, action.value) };
    default:
      return state;
  }
}

const LAYER_NAME: Record<LayerId, { en: string; ar: string }> = {
  temperature: { en: 'Temperature', ar: 'الحرارة' },
  wildfire: { en: 'Fire history', ar: 'تاريخ الحرايق' },
  sea_ice: { en: 'Sea ice', ar: 'الجليد البحري' },
  co2: { en: 'Carbon dioxide', ar: 'ثاني أكسيد الكربون' },
  night_lights: { en: 'Night lights', ar: 'أنوار الليل' },
  ocean_sst: { en: 'Ocean', ar: 'حرارة المحيط' },
  ocean_currents: { en: 'Ocean currents', ar: 'تيارات المحيط' },
  aerosols: { en: 'Aerosols', ar: 'الغبار والدخان' },
  air_quality: { en: 'Air quality', ar: 'جودة الهوا' },
  lightning: { en: 'Lightning', ar: 'البرق' },
  forest: { en: 'Forest height', ar: 'طول الغابات' },
  precipitation: { en: 'Rainfall', ar: 'المطر' },
  events: { en: 'Natural events', ar: 'أحداث طبيعية' },
};

function wildfireDate(state: AppData): string | null {
  const cells = state.catalog.wildfire?.data.cells ?? [];
  const days = [...new Set(cells.map((cell) => cell.t))].sort();
  if (days.includes('2025-08-04')) return '2025-08-04';
  return days[0] ?? null;
}

export function summarize(state: AppData): { en: string; ar: string } {
  const namesEn = state.layers.map((id) => LAYER_NAME[id].en).join(', ');
  const namesAr = state.layers.map((id) => LAYER_NAME[id].ar).join('، ');
  const region = REGIONS.find((item) => item.id === state.region) ?? REGIONS[0];
  const regionEn = region?.label.en ?? state.region;
  const regionAr = region?.label.ar ?? state.region;
  const day = state.layers[0] === 'wildfire' ? wildfireDate(state) : null;
  const whenEn = day ? formatIsoDate(day, 'en') : formatYear(state.time.cursor, 'en');
  const whenAr = day ? formatIsoDate(day, 'ar') : formatYear(state.time.cursor, 'ar');
  const active = state.catalog[state.layers[0] ?? 'temperature'];
  const noRegion = active ? !active.data.series[state.region] : false;
  const noteEn = noRegion ? ', no regional series for this layer' : '';
  const noteAr = noRegion ? '، مفيش سلسلة للمنطقة دي في الطبقة دي' : '';
  return {
    en: `${namesEn}, ${regionEn}, ${whenEn}${noteEn}`,
    ar: `${namesAr}، ${regionAr}، ${whenAr}${noteAr}`,
  };
}

function variableSpec(spec: LayerConfig['variables']['how_much']): VariableSpec {
  const range: [number, number] = [spec.range[0], spec.range[1]];
  if (!spec.normalize) return { field: spec.field, range };
  const p = spec.normalize.p;
  return {
    field: spec.field,
    range,
    normalize: p
      ? { method: spec.normalize.method, p: [p[0], p[1]] }
      : { method: spec.normalize.method },
  };
}

function scoreLayer(loaded: LoadedLayer): ScoreInput['layers'][number] {
  const config: ScoreLayerConfig = {
    id: loaded.config.id,
    timeKind: loaded.config.timeKind,
    variables: {
      how_much: variableSpec(loaded.config.variables.how_much),
      how_strong: variableSpec(loaded.config.variables.how_strong),
      how_fast: variableSpec(loaded.config.variables.how_fast),
      where: { field: loaded.config.variables.where.field },
    },
    what: {
      timbre: loaded.config.what.timbre,
      register: [loaded.config.what.register[0], loaded.config.what.register[1]],
      symphonyRegister: [
        loaded.config.what.symphonyRegister[0],
        loaded.config.what.symphonyRegister[1],
      ],
    },
    symphony: { from: loaded.config.symphony.from, to: loaded.config.symphony.to },
  };
  return {
    config,
    data: {
      series: loaded.data.series,
      annual: loaded.data.annual,
      cells: loaded.data.cells,
      seasonalAmplitude: loaded.data.seasonalAmplitude,
      ...(loaded.data.variables ? { variables: loaded.data.variables } : {}),
      ...(loaded.data.markers
        ? {
            markers: loaded.data.markers.map((marker) => ({
              id: marker.id,
              category: marker.category,
              lon: marker.lon,
            })),
          }
        : {}),
    },
  };
}

function toScoreInput(state: AppData): ScoreInput | null {
  const layers = state.layers.flatMap((id) => {
    const loaded = state.catalog[id];
    return loaded ? [scoreLayer(loaded)] : [];
  });
  if (layers.length === 0) return null;
  const mode = state.playback.mode === 'idle' ? 'sweep' : state.playback.mode;
  return {
    mode,
    speed: state.playback.speed,
    scale: state.scale,
    tuning: state.tuning,
    view: state.view,
    region: state.region,
    regions: {
      global: regionCentre('global'),
      egypt: regionCentre('egypt'),
      africa: regionCentre('africa'),
      arctic: regionCentre('arctic'),
      europe: regionCentre('europe'),
      asia: regionCentre('asia'),
      americas: regionCentre('americas'),
      oceania: regionCentre('oceania'),
    },
    time: state.time,
    ...(state.playback.compare ? { compare: state.playback.compare } : {}),
    layers,
  };
}

export function scoreFor(state: AppData): Score | null {
  const input = toScoreInput(state);
  if (!input) return null;
  if (state.layers.length === SYMPHONY_LAYERS) input.mode = 'symphony';
  return buildScore(input);
}

interface AppStore extends AppData {
  dispatch: (action: Action, origin: Origin) => void;
  setCatalog: (catalog: Partial<Record<LayerId, LoadedLayer>>) => void;
  setDemo: (demo: boolean, debug: boolean) => void;
  markIntroSeen: (seen: boolean) => void;
  setHub: (hub: boolean) => void;
  setTutorialIndex: (index: number) => void;
  closeQuiz: () => void;
  setVisual: (visual: AppData['visual']) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialAppData(),
  dispatch: (action, origin) => {
    const parsed = parseAction(action);
    if (!parsed) {
      announce(
        { en: 'That command was not valid.', ar: 'الأمر ده مش مفهوم.' },
        { priority: 'assertive', speak: true },
      );
      return;
    }
    const next = reduceApp(get(), parsed);
    const scored = { ...next, lastScore: scoreFor(next) ?? next.lastScore };
    set(scored);
    emit(parsed, origin);
    if (parsed.type === 'help') {
      announce({
        en: 'Say play temperature, stop, or help.',
        ar: 'قول شغّل الحرارة، أو وقّف، أو مساعدة.',
      });
    } else if (parsed.type === 'stop') {
      announce({ en: 'Stopped.', ar: 'وقّفت.' });
    } else {
      announce(summarize(scored));
    }
    if (typeof window !== 'undefined') {
      if (parsed.type === 'set_mode') localStorage.setItem('el.mode', scored.mode);
      if (parsed.type === 'set_setting' || parsed.type === 'set_language') {
        localStorage.setItem('el.settings.v1', JSON.stringify(scored.settings));
      }
    }
  },
  setCatalog: (catalog) => {
    const current = get();
    const sample = sampleFor(current.layers, catalog);
    const next = { ...current, catalog, sample };
    const oldBounds = layerBounds(current);
    const bounds = layerBounds(next);
    // Data loads in two phases: the recorded history first, then the live point.
    // Expand a full-range selection when the live point reaches a new year,
    // but never shrink a range the listener chose.
    const keepMin = current.time.from > oldBounds.min + 1e-9;
    const keepMax = current.time.to < oldBounds.max - 1e-9;
    const from = keepMin ? clamp(current.time.from, bounds.min, bounds.max) : bounds.min;
    const to = keepMax ? clamp(current.time.to, bounds.min, bounds.max) : bounds.max;
    const time = {
      from,
      to,
      cursor: clamp(current.time.cursor, Math.min(from, to), Math.max(from, to)),
    };
    const scored = { ...next, time };
    set({ catalog, sample, time, lastScore: scoreFor(scored) ?? current.lastScore });
  },
  setDemo: (demo, debug) => set({ demo, debug, introSeen: demo ? true : get().introSeen }),
  markIntroSeen: (seen) => {
    set({ introSeen: seen, introNonce: seen ? get().introNonce : get().introNonce + 1 });
    if (typeof window !== 'undefined') localStorage.setItem('el.introSeen', seen ? '1' : '0');
  },
  setHub: (hub) => set({ hub }),
  setTutorialIndex: (index) => set({ tutorial: { index, stepId: null } }),
  closeQuiz: () => set({ quiz: null }),
  setVisual: (visual) => set({ visual }),
}));
