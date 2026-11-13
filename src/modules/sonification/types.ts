import type { LayerId, RegionId, ScaleId, Speed, TuningMode } from '@/core/actions';

export type EarconId =
  | 'start'
  | 'stop'
  | 'layer_added'
  | 'region_changed'
  | 'record'
  | 'missing'
  | 'out_of_range'
  | 'quiz_correct'
  | 'quiz_wrong'
  | 'listening'
  | 'error'
  | 'fire'
  | 'volcano'
  | 'storm'
  | 'ice'
  | 'flood'
  | 'event';

export interface NoteEvent {
  t: number;
  dur: number;
  layerId: LayerId;
  voiceId: string;
  midiRaw: number;
  midi: number;
  freqHz: number;
  gainDb: number;
  pan: number;
  pos: { x: number; y: number; z: number };
  lowpassHz: number;
  ticks: number;
  bpm?: number;
  flags: { missing: boolean; outOfRange: boolean; record: boolean };
  source: { t: number | string; v: number | null; region?: RegionId; lat?: number; lon?: number };
}

export interface Score {
  events: NoteEvent[];
  earcons: { t: number; id: EarconId }[];
  duration: number;
  mode: 'sweep' | 'dwell' | 'compare' | 'symphony';
}

export interface VariableSpec {
  field: string;
  range: [number, number];
  normalize?: { method: 'minmax' | 'robust'; p?: [number, number] };
}

export interface ScoreLayerConfig {
  id: LayerId;
  timeKind: 'year' | 'day';
  variables: {
    how_much: VariableSpec;
    how_strong: VariableSpec;
    how_fast: VariableSpec;
    where: { field: string };
  };
  what: { timbre: string; register: [number, number]; symphonyRegister: [number, number] };
  symphony?: { from: number; to: number };
}

export interface ScorePoint {
  t: number | string;
  v: number | null;
}

export interface ScoreCell {
  t: string;
  lat: number;
  lon: number;
  count: number;
  frp_mean: number;
}

export interface ScoreMarker {
  id: string;
  category: string;
  lon: number;
}

export interface ScoreLayerData {
  series: Partial<Record<RegionId, ScorePoint[]>>;
  annual?: ScorePoint[] | null;
  cells?: ScoreCell[] | null;
  seasonalAmplitude?: ScorePoint[] | null;
  variables?: Record<string, ScorePoint[]>;
  markers?: ScoreMarker[];
}

export interface ScoreInput {
  mode: 'sweep' | 'dwell' | 'compare' | 'symphony';
  speed: Speed;
  scale: ScaleId;
  tuning: TuningMode;
  view: { lat: number; lon: number };
  region: RegionId;
  regions: Partial<Record<RegionId, { lat: number; lon: number }>>;
  time: { from: number; to: number; cursor: number };
  compare?: { a: number; b: number };
  layers: { config: ScoreLayerConfig; data: ScoreLayerData }[];
}
