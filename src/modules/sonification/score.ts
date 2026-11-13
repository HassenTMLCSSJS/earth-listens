import type { LayerId, RegionId } from '@/core/actions';
import { COMPARE_GAP_SEC, COMPARE_SEC, DWELL_SEC, NOTE_DUTY } from './constants';
import { normalizeMinMax, normalizeRobust, type NormResult } from './math/normalize';
import { midiFromNorm, midiToHz, quantize } from './math/pitch';
import { bpmForRate, changeRate, periodForRate, stepSeconds, ticksForRate } from './math/rhythm';
import { r6 } from './math/round';
import { globalSpatial, roundSpatial, spatialize, type Spatial } from './math/spatial';
import { combineGain, strengthDb, symphonyTrimDb, voiceCountDb } from './math/volume';
import type {
  EarconId,
  NoteEvent,
  Score,
  ScoreCell,
  ScoreInput,
  ScoreLayerConfig,
  ScoreLayerData,
  ScorePoint,
  VariableSpec,
} from './types';

interface Draft {
  t: number;
  dur: number;
  layerId: LayerId;
  voiceId: string;
  midiRaw: number;
  midi: number;
  freqHz: number;
  strengthN: number;
  spatial: Spatial;
  ticks: number;
  bpm?: number;
  flags: { missing: boolean; outOfRange: boolean; record: boolean };
  source: NoteEvent['source'];
  trim: number;
}

interface AxisPoint {
  label: number | string;
  index: number;
  much: number | null;
  strong: number | null;
  delta: number | null;
  lat?: number;
  lon?: number;
}

function finite(v: number | null | undefined): v is number {
  return v !== null && v !== undefined && Number.isFinite(v);
}

function normalizeVar(v: number | null, spec: VariableSpec, pool: readonly number[]): NormResult {
  if (spec.field.startsWith('const:')) {
    const raw = Number(spec.field.slice('const:'.length));
    return normalizeMinMax(Number.isFinite(raw) ? raw : null, spec.range[0], spec.range[1]);
  }
  if (spec.normalize?.method === 'robust') {
    const p = spec.normalize.p ?? [5, 95];
    return normalizeRobust(v, pool, p[0], p[1]);
  }
  return normalizeMinMax(v, spec.range[0], spec.range[1]);
}

function poolFor(data: ScoreLayerData, field: string): number[] {
  if (field.startsWith('const:')) return [];
  if (field === 'count' || field === 'frp_mean' || field === 'delta(count)') {
    const cells = data.cells ?? [];
    return cells
      .map((cell) => (field === 'frp_mean' ? cell.frp_mean : cell.count))
      .filter((v) => Number.isFinite(v));
  }
  const values: number[] = [];
  for (const series of Object.values(data.series)) {
    if (!series) continue;
    for (const point of series) {
      if (!finite(point.v)) continue;
      values.push(field === 'abs(v)' ? Math.abs(point.v) : point.v);
    }
  }
  if (field === 'v' && data.annual) {
    for (const point of data.annual) if (finite(point.v)) values.push(point.v);
  }
  return values;
}

function whereFor(
  field: string,
  region: RegionId,
  regions: ScoreInput['regions'],
  lat?: number,
  lon?: number,
): { spatial: boolean; lat: number; lon: number } {
  if (field === 'global' || (field === 'region_center' && region === 'global')) {
    return { spatial: false, lat: 0, lon: 0 };
  }
  if (field === 'region_center') {
    const centre = regions[region];
    return { spatial: true, lat: centre?.lat ?? 0, lon: centre?.lon ?? 0 };
  }
  if (field === 'cell' && lat !== undefined && lon !== undefined) {
    return { spatial: true, lat, lon };
  }
  if (field.startsWith('fixed:')) {
    const [latText, lonText] = field.slice('fixed:'.length).split(',');
    return { spatial: true, lat: Number(latText), lon: Number(lonText) };
  }
  return { spatial: false, lat: 0, lon: 0 };
}

function place(view: ScoreInput['view'], spatial: boolean, lat: number, lon: number): Spatial {
  if (!spatial) return globalSpatial();
  return spatialize(lat, lon, view.lat, view.lon);
}

function deltaOf(values: readonly (number | null)[], index: number): number | null {
  if (index <= 0) return null;
  const cur = values[index];
  const prev = values[index - 1];
  if (!finite(cur) || !finite(prev)) return null;
  return cur - prev;
}

function seriesInRange(points: readonly ScorePoint[], from: number, to: number): ScorePoint[] {
  return points.filter((point) => typeof point.t === 'number' && point.t >= from && point.t <= to);
}

function temperatureLikeAxis(points: readonly ScorePoint[]): AxisPoint[] {
  const values = points.map((point) => point.v);
  return points.map((point, index) => ({
    label: point.t,
    index,
    much: point.v,
    strong: finite(point.v) ? Math.abs(point.v) : null,
    delta: deltaOf(values, index),
  }));
}

function cellsByDay(cells: readonly ScoreCell[]): Map<string, ScoreCell[]> {
  const map = new Map<string, ScoreCell[]>();
  for (const cell of cells) {
    const list = map.get(cell.t) ?? [];
    list.push(cell);
    map.set(cell.t, list);
  }
  return map;
}

function topCells(cells: readonly ScoreCell[], limit = 24): ScoreCell[] {
  return cells
    .slice()
    .sort((a, b) => b.count - a.count || b.lat - a.lat || a.lon - b.lon)
    .slice(0, limit);
}

function pushDrafts(
  drafts: Draft[],
  earcons: { t: number; id: EarconId }[],
  input: ScoreInput,
  layerId: LayerId,
  voiceId: string,
  config: ScoreLayerConfig,
  axis: AxisPoint[],
  whereField: string,
  register: [number, number],
  trim: number,
  timing: { t: number; dur: number; bpm?: number }[] | 'sweep',
  pools: { much: number[]; strong: number[] },
  region?: RegionId,
): void {
  let outRun = false;
  let finiteSeen = false;
  let maxFinite = Number.NEGATIVE_INFINITY;
  axis.forEach((point, index) => {
    const much = normalizeVar(point.much, config.variables.how_much, pools.much);
    const strongRaw = config.variables.how_strong.field.startsWith('const:') ? null : point.strong;
    const strong = config.variables.how_strong.field.startsWith('const:')
      ? normalizeVar(null, config.variables.how_strong, pools.strong)
      : normalizeVar(strongRaw, config.variables.how_strong, pools.strong);
    const missing = much.n === null;
    const outOfRange = !missing && much.outOfRange;
    const record = !missing && finite(point.much) && finiteSeen && point.much > maxFinite;
    if (finite(point.much)) {
      if (!finiteSeen || point.much > maxFinite) maxFinite = point.much;
      finiteSeen = true;
    }
    const rate = changeRate(point.delta, config.variables.how_fast.range);
    const ticks = ticksForRate(rate);
    const where = whereFor(whereField, region ?? input.region, input.regions, point.lat, point.lon);
    const spatial = place(input.view, where.spatial, where.lat, where.lon);
    const step = stepSeconds(input.speed);
    const timed =
      timing === 'sweep'
        ? { t: index * step, dur: NOTE_DUTY * step }
        : (timing[index] ?? { t: index * step, dur: NOTE_DUTY * step });
    let midiRaw = 0;
    let midi = 0;
    let freqHz = 0;
    if (!missing && much.n !== null) {
      midiRaw = midiFromNorm(much.n, register);
      midi = quantize(midiRaw, input.scale, input.tuning, register);
      freqHz = midiToHz(midi);
    }
    const source: NoteEvent['source'] = { t: point.label, v: point.much };
    if (region) source.region = region;
    if (point.lat !== undefined) source.lat = point.lat;
    if (point.lon !== undefined) source.lon = point.lon;
    drafts.push({
      t: timed.t,
      dur: timed.dur,
      layerId,
      voiceId,
      midiRaw,
      midi,
      freqHz,
      strengthN: strong.n ?? 0,
      spatial,
      ticks,
      ...(timed.bpm !== undefined ? { bpm: timed.bpm } : {}),
      flags: { missing, outOfRange, record },
      source,
      trim,
    });
    if (missing && input.mode !== 'symphony') earcons.push({ t: timed.t, id: 'missing' });
    if (outOfRange && !outRun) earcons.push({ t: timed.t, id: 'out_of_range' });
    outRun = outOfRange;
    if (record) earcons.push({ t: timed.t, id: 'record' });
  });
}

function sweepLayers(
  input: ScoreInput,
  drafts: Draft[],
  earcons: { t: number; id: EarconId }[],
): number {
  let steps = 0;
  for (const layer of input.layers) {
    const { config, data } = layer;
    const pools = {
      much: poolFor(data, config.variables.how_much.field),
      strong: poolFor(data, config.variables.how_strong.field),
    };
    if (config.variables.where.field === 'cell' && data.cells && data.cells.length > 0) {
      const byDay = cellsByDay(data.cells);
      const days = [...byDay.keys()].sort();
      const chosen = days.map((day) => topCells(byDay.get(day) ?? []));
      steps = Math.max(steps, days.length);
      const voices = new Map<string, { point: AxisPoint; dayIndex: number }[]>();
      chosen.forEach((cells, dayIndex) => {
        for (const cell of cells) {
          const id = `${config.id}:${cell.lat},${cell.lon}`;
          const prev =
            dayIndex >= 7
              ? chosen[dayIndex - 7]?.find((item) => item.lat === cell.lat && item.lon === cell.lon)
              : undefined;
          const list = voices.get(id) ?? [];
          list.push({
            dayIndex,
            point: {
              label: cell.t,
              index: dayIndex,
              much: cell.count,
              strong: cell.frp_mean,
              delta: prev ? cell.count - prev.count : null,
              lat: cell.lat,
              lon: cell.lon,
            },
          });
          voices.set(id, list);
        }
      });
      const step = stepSeconds(input.speed);
      for (const [voiceId, hits] of voices) {
        pushDrafts(
          drafts,
          earcons,
          input,
          config.id,
          voiceId,
          config,
          hits.map((hit) => hit.point),
          'cell',
          config.what.register,
          0,
          hits.map((hit) => ({ t: hit.dayIndex * step, dur: NOTE_DUTY * step })),
          pools,
          input.region,
        );
      }
      continue;
    }
    const points = seriesInRange(
      data.series[input.region] ?? data.series.global ?? [],
      input.time.from,
      input.time.to,
    );
    const axis = temperatureLikeAxis(points).map((point) => ({
      ...point,
      strong: strongFor(config, point),
    }));
    steps = Math.max(steps, axis.length);
    pushDrafts(
      drafts,
      earcons,
      input,
      config.id,
      `${config.id}:${input.region}`,
      config,
      axis,
      config.variables.where.field,
      config.what.register,
      0,
      'sweep',
      pools,
      input.region,
    );
  }
  return steps;
}

function strongFor(config: ScoreLayerConfig, point: AxisPoint): number | null {
  const field = config.variables.how_strong.field;
  if (field.startsWith('const:')) return Number(field.slice('const:'.length));
  if (field === 'abs(v)') return point.strong;
  if (field === 'v') return point.much;
  return point.strong;
}

function compareScore(
  input: ScoreInput,
  drafts: Draft[],
  earcons: { t: number; id: EarconId }[],
): number {
  const pair = input.compare;
  if (!pair) return 0;
  for (const layer of input.layers) {
    const points = layer.data.series[input.region] ?? layer.data.series.global ?? [];
    const values = points.map((point) => point.v);
    const picks = [pair.a, pair.b].map((year, slot) => {
      const index = points.findIndex((point) => point.t === year);
      const point = index >= 0 ? points[index] : undefined;
      return {
        label: year,
        index: slot,
        much: point?.v ?? null,
        strong: point && finite(point.v) ? Math.abs(point.v) : null,
        delta: index >= 0 ? deltaOf(values, index) : null,
      };
    });
    const pools = {
      much: poolFor(layer.data, layer.config.variables.how_much.field),
      strong: poolFor(layer.data, layer.config.variables.how_strong.field),
    };
    pushDrafts(
      drafts,
      earcons,
      input,
      layer.config.id,
      `${layer.config.id}:${input.region}`,
      layer.config,
      picks.map((point) => ({ ...point, strong: strongFor(layer.config, point) })),
      layer.config.variables.where.field,
      layer.config.what.register,
      0,
      [
        { t: 0, dur: COMPARE_SEC },
        { t: COMPARE_SEC + COMPARE_GAP_SEC, dur: COMPARE_SEC },
      ],
      pools,
      input.region,
    );
  }
  return 1;
}

function dwellScore(
  input: ScoreInput,
  drafts: Draft[],
  earcons: { t: number; id: EarconId }[],
): number {
  for (const layer of input.layers) {
    const points = layer.data.series[input.region] ?? layer.data.series.global ?? [];
    const index = points.findIndex((point) => point.t === input.time.cursor);
    const point = points[index] ?? points[0];
    if (!point) continue;
    const values = points.map((item) => item.v);
    const axisPoint: AxisPoint = {
      label: point.t,
      index: 0,
      much: point.v,
      strong: finite(point.v) ? Math.abs(point.v) : null,
      delta: index >= 0 ? deltaOf(values, index) : null,
    };
    const rate = changeRate(axisPoint.delta, layer.config.variables.how_fast.range);
    const bpm = bpmForRate(rate);
    const period = periodForRate(rate);
    const repeats: { t: number; dur: number; bpm: number }[] = [];
    for (let t = 0; t < DWELL_SEC - 1e-9; t += period) {
      repeats.push({ t, dur: Math.min(NOTE_DUTY * period, DWELL_SEC - t), bpm });
    }
    const axis = repeats.map(() => ({ ...axisPoint, strong: strongFor(layer.config, axisPoint) }));
    const pools = {
      much: poolFor(layer.data, layer.config.variables.how_much.field),
      strong: poolFor(layer.data, layer.config.variables.how_strong.field),
    };
    pushDrafts(
      drafts,
      earcons,
      input,
      layer.config.id,
      `${layer.config.id}:${input.region}`,
      layer.config,
      axis,
      layer.config.variables.where.field,
      layer.config.what.register,
      0,
      repeats,
      pools,
      input.region,
    );
  }
  return 1;
}

function symphonyScore(
  input: ScoreInput,
  drafts: Draft[],
  earcons: { t: number; id: EarconId }[],
): number {
  const from = input.layers[0]?.config.symphony?.from ?? 1958;
  const to = input.layers[0]?.config.symphony?.to ?? 2025;
  const years: number[] = [];
  for (let year = from; year <= to; year += 1) years.push(year);
  for (const layer of input.layers) {
    const source =
      layer.config.id === 'wildfire' ? (layer.data.annual ?? []) : (layer.data.series.global ?? []);
    const byYear = new Map<number, ScorePoint>();
    for (const point of source) if (typeof point.t === 'number') byYear.set(point.t, point);
    const values = years.map((year) => byYear.get(year)?.v ?? null);
    const axis: AxisPoint[] = [];
    const timing: { t: number; dur: number }[] = [];
    years.forEach((year, index) => {
      const value = values[index] ?? null;
      if (!finite(value)) return;
      const step = stepSeconds(input.speed);
      axis.push({
        label: year,
        index,
        much: value,
        strong: layer.config.id === 'wildfire' ? value : Math.abs(value),
        delta: deltaOf(values, index),
      });
      timing.push({ t: (year - from) * step, dur: NOTE_DUTY * step });
    });
    const where = layer.config.id === 'wildfire' ? 'global' : layer.config.variables.where.field;
    const pools = {
      much: poolFor(layer.data, layer.config.variables.how_much.field),
      strong: poolFor(layer.data, layer.config.variables.how_strong.field),
    };
    const adjusted = axis.map((point) => ({ ...point, strong: strongFor(layer.config, point) }));
    pushDrafts(
      drafts,
      earcons,
      input,
      layer.config.id,
      `${layer.config.id}:symphony`,
      layer.config,
      adjusted,
      where,
      layer.config.what.symphonyRegister,
      symphonyTrimDb(4),
      timing,
      pools,
      'global',
    );
  }
  return years.length;
}

function finalize(
  drafts: Draft[],
  earcons: { t: number; id: EarconId }[],
  mode: Score['mode'],
  steps: number,
  speed: ScoreInput['speed'],
): Score {
  const counts = new Map<number, number>();
  for (const draft of drafts) {
    if (draft.flags.missing) continue;
    const key = r6(draft.t);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const events: NoteEvent[] = drafts.map((draft) => {
    const key = r6(draft.t);
    const gain = combineGain(
      strengthDb(draft.strengthN),
      voiceCountDb(counts.get(key) ?? 1),
      draft.spatial.backDb,
      draft.trim,
    );
    const spatial = roundSpatial(draft.spatial);
    const event: NoteEvent = {
      t: r6(draft.t),
      dur: r6(draft.dur),
      layerId: draft.layerId,
      voiceId: draft.voiceId,
      midiRaw: r6(draft.midiRaw),
      midi: r6(draft.midi),
      freqHz: r6(draft.freqHz),
      gainDb: r6(gain),
      pan: spatial.pan,
      pos: spatial.pos,
      lowpassHz: spatial.lowpassHz,
      ticks: draft.ticks,
      flags: draft.flags,
      source: draft.source,
    };
    if (draft.bpm !== undefined) event.bpm = r6(draft.bpm);
    return event;
  });
  events.sort(
    (a, b) =>
      a.t - b.t ||
      (a.layerId < b.layerId ? -1 : a.layerId > b.layerId ? 1 : 0) ||
      (a.voiceId < b.voiceId ? -1 : a.voiceId > b.voiceId ? 1 : 0),
  );
  const roundedEarcons = earcons
    .map((earcon) => ({ t: r6(earcon.t), id: earcon.id }))
    .sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const step = stepSeconds(speed);
  const duration =
    mode === 'compare'
      ? COMPARE_SEC * 2 + COMPARE_GAP_SEC
      : mode === 'dwell'
        ? DWELL_SEC
        : r6(steps * step);
  return { events, earcons: roundedEarcons, duration, mode };
}

/** Pure, deterministic sonification. Same input → byte-identical score. */
export function buildScore(input: ScoreInput): Score {
  const drafts: Draft[] = [];
  const earcons: { t: number; id: EarconId }[] = [];
  let steps = 0;
  if (input.mode === 'symphony') steps = symphonyScore(input, drafts, earcons);
  else if (input.mode === 'compare') steps = compareScore(input, drafts, earcons);
  else if (input.mode === 'dwell') steps = dwellScore(input, drafts, earcons);
  else steps = sweepLayers(input, drafts, earcons);
  return finalize(drafts, earcons, input.mode, steps, input.speed);
}
