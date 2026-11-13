import { describe, expect, it } from 'vitest';
import { buildScore, type ScoreInput } from '@/modules/sonification';

function temperatureInput(values: (number | null)[]): ScoreInput {
  return {
    mode: 'sweep',
    speed: 'normal',
    scale: 'pentatonic_major',
    tuning: 'microtonal',
    view: { lat: 0, lon: 0 },
    region: 'global',
    regions: { global: { lat: 0, lon: 0 } },
    time: { from: 2000, to: 2004, cursor: 2000 },
    layers: [
      {
        config: {
          id: 'temperature',
          timeKind: 'year',
          variables: {
            how_much: { field: 'v', range: [-0.6, 1.4], normalize: { method: 'minmax' } },
            how_strong: { field: 'abs(v)', range: [0, 1.4] },
            how_fast: { field: 'delta(v)', range: [-0.3, 0.3] },
            where: { field: 'region_center' },
          },
          what: { timbre: 'warm-lead', register: [48, 84], symphonyRegister: [48, 67] },
          symphony: { from: 1958, to: 2025 },
        },
        data: {
          series: {
            global: values.map((v, index) => ({ t: 2000 + index, v })),
          },
        },
      },
    ],
  };
}

describe('buildScore', () => {
  const input = temperatureInput([0, 0.1, null, 0.3, 1.5]);

  it('places the five-step temperature fixture', () => {
    const score = buildScore(input);
    expect(score.mode).toBe('sweep');
    expect(score.events.map((event) => event.t)).toEqual([0, 0.3, 0.6, 0.9, 1.2]);
    expect(score.events[2]?.flags.missing).toBe(true);
    expect(score.earcons).toContainEqual({ t: 0.6, id: 'missing' });
    expect(score.events[3]?.ticks).toBe(1);
    expect(score.events[3]?.flags.missing).toBe(false);
    expect(score.events[4]?.flags.outOfRange).toBe(true);
    expect(score.events[4]?.flags.record).toBe(true);
    expect(score.events.every((event) => event.gainDb <= -6)).toBe(true);
  });

  it('sounds a missing earcon and no note for a region without a series', () => {
    const score = buildScore({ ...input, region: 'egypt' });
    expect(score.events).toHaveLength(0);
    expect(score.earcons).toEqual([{ t: 0, id: 'missing' }]);
  });

  it('is byte-identical across two runs', () => {
    const first = JSON.stringify(buildScore(input));
    const second = JSON.stringify(buildScore(input));
    expect(first).toBe(second);
    expect(buildScore(input)).toMatchSnapshot();
  });

  it('keeps a repeated symphony score identical and under the gain ceiling', () => {
    const years = Array.from({ length: 10 }, (_, index) => ({ t: 1958 + index, v: index / 10 }));
    const base = temperatureInput([0]);
    const layer = base.layers[0];
    if (!layer) throw new Error('missing layer');
    const symphony: ScoreInput = {
      ...base,
      mode: 'symphony',
      time: { from: 1958, to: 1967, cursor: 1958 },
      layers: [
        { ...layer, data: { series: { global: years }, annual: years } },
        {
          config: {
            ...layer.config,
            id: 'co2',
            variables: {
              ...layer.config.variables,
              how_much: { field: 'v', range: [310, 440] },
              how_strong: { field: 'const:0.5', range: [0, 1] },
            },
            what: { timbre: 'beating-drone', register: [36, 43], symphonyRegister: [36, 43] },
          },
          data: { series: { global: years.map((point) => ({ t: point.t, v: 320 + point.v })) } },
        },
      ],
    };
    const score = buildScore(symphony);
    expect(score.mode).toBe('symphony');
    expect(score.events.length).toBeGreaterThan(0);
    expect(score.events.every((event) => event.gainDb <= -6)).toBe(true);
    expect(JSON.stringify(score)).toBe(JSON.stringify(buildScore(symphony)));
  });

  it('builds compare, dwell, spatial and wildfire scores', () => {
    const compare = buildScore({
      ...input,
      mode: 'compare',
      compare: { a: 2000, b: 2004 },
      region: 'egypt',
      regions: { egypt: { lat: 26.8, lon: 30.8 }, global: { lat: 0, lon: 0 } },
      layers: [
        {
          ...input.layers[0]!,
          data: { series: { egypt: input.layers[0]!.data.series.global ?? [] } },
        },
      ],
    });
    expect(compare.duration).toBe(4.5);
    expect(compare.events.length).toBeGreaterThan(0);

    const dwell = buildScore({
      ...input,
      mode: 'dwell',
      time: { from: 2000, to: 2004, cursor: 2001 },
    });
    expect(dwell.duration).toBe(8);
    expect(dwell.events.every((event) => event.dur > 0)).toBe(true);

    const robust = buildScore({
      ...input,
      layers: [
        {
          ...input.layers[0]!,
          config: {
            ...input.layers[0]!.config,
            variables: {
              ...input.layers[0]!.config.variables,
              how_much: { field: 'v', range: [-1, 2], normalize: { method: 'robust', p: [5, 95] } },
              where: { field: 'fixed:80,0' },
            },
          },
        },
      ],
    });
    expect(robust.events.length).toBeGreaterThan(0);

    const fireInput: ScoreInput = {
      ...input,
      time: { from: 2012, to: 2025, cursor: 2020 },
      layers: [
        {
          config: {
            id: 'wildfire',
            timeKind: 'day',
            variables: {
              how_much: { field: 'count', range: [0, 500] },
              how_strong: { field: 'frp_mean', range: [0, 100] },
              how_fast: { field: 'delta(count)', range: [0, 40] },
              where: { field: 'cell' },
            },
            what: { timbre: 'crackle-marimba', register: [60, 84], symphonyRegister: [69, 81] },
            symphony: { from: 2012, to: 2025 },
          },
          data: {
            series: { global: [{ t: 2020, v: 40 }] },
            annual: [{ t: 2020, v: 40 }],
            cells: [
              { t: '2025-07-01', lat: 37.5, lon: 22.5, count: 12, frp_mean: 20 },
              { t: '2025-07-08', lat: 37.5, lon: 22.5, count: 40, frp_mean: 55 },
              { t: '2025-07-08', lat: 10, lon: 10, count: 4, frp_mean: 8 },
            ],
          },
        },
      ],
    };
    const fires = buildScore(fireInput);
    expect(fires.events.some((event) => event.voiceId.startsWith('wildfire:'))).toBe(true);
    const symphony = buildScore({ ...fireInput, mode: 'symphony' });
    expect(symphony.events.every((event) => event.gainDb <= -6)).toBe(true);
  });
});
