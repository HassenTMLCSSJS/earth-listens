import { describe, expect, it } from 'vitest';
import { buildScore } from './score';
import type { ScoreInput } from './types';
import {
  biomassLoudness,
  earconForCategory,
  eventPasses,
  gestureFor,
  icePitchDescends,
} from './mappings';

describe('layer gestures', () => {
  it('silences a missing value and a dry rain cell', () => {
    const missing = gestureFor({
      layerId: 'precipitation',
      value: null,
      strengthN: 0.4,
      ticks: 2,
      lowpassHz: 20000,
      freqHz: 440,
      missing: true,
    });
    expect(missing.freqHz).toBe(0);
    expect(missing.ticks).toBe(0);
    const dry = gestureFor({
      layerId: 'precipitation',
      value: 0,
      strengthN: 0.2,
      ticks: 2,
      lowpassHz: 20000,
      freqHz: 440,
      missing: false,
    });
    expect(dry.freqHz).toBe(0);
    expect(dry.ticks).toBe(0);
  });

  it('brightens heat, muffles aerosols, and ticks rain and lightning', () => {
    const hot = gestureFor({
      layerId: 'temperature',
      value: 1.2,
      strengthN: 1,
      ticks: 1,
      lowpassHz: 20000,
      freqHz: 500,
      missing: false,
    });
    const cold = gestureFor({
      layerId: 'temperature',
      value: 0,
      strengthN: 0,
      ticks: 1,
      lowpassHz: 20000,
      freqHz: 200,
      missing: false,
    });
    expect(hot.lowpassHz).toBeGreaterThan(cold.lowpassHz);
    const haze = gestureFor({
      layerId: 'aerosols',
      value: 1,
      strengthN: 1,
      ticks: 1,
      lowpassHz: 20000,
      freqHz: 300,
      missing: false,
    });
    const clear = gestureFor({
      layerId: 'aerosols',
      value: 0,
      strengthN: 0,
      ticks: 1,
      lowpassHz: 20000,
      freqHz: 300,
      missing: false,
    });
    expect(haze.lowpassHz).toBeLessThan(clear.lowpassHz);
    const rain = gestureFor({
      layerId: 'precipitation',
      value: 30,
      strengthN: 0.5,
      ticks: 0,
      lowpassHz: 20000,
      freqHz: 400,
      missing: false,
    });
    expect(rain.ticks).toBeGreaterThan(0);
    expect(rain.freqHz).toBe(400);
    const bolts = gestureFor({
      layerId: 'lightning',
      value: 0.8,
      strengthN: 0.8,
      ticks: 0,
      lowpassHz: 20000,
      freqHz: 700,
      missing: false,
    });
    expect(bolts.ticks).toBeGreaterThan(0);
  });

  it('uses canopy spread as extra ticks and biomass as loudness', () => {
    const even = gestureFor({
      layerId: 'forest',
      value: 20,
      strengthN: 0.5,
      ticks: 1,
      lowpassHz: 20000,
      freqHz: 300,
      missing: false,
      stddev: 0,
    });
    const rough = gestureFor({
      layerId: 'forest',
      value: 20,
      strengthN: 0.5,
      ticks: 1,
      lowpassHz: 20000,
      freqHz: 300,
      missing: false,
      stddev: 20,
    });
    expect(rough.ticks).toBeGreaterThan(even.ticks);
    expect(biomassLoudness(null)).toBe(1);
    expect(biomassLoudness(300)).toBeGreaterThan(biomassLoudness(0));
  });

  it('places event earcons at most three times a second', () => {
    expect(earconForCategory('Wildfires')).toBe('fire');
    expect(earconForCategory('Severe Storms')).toBe('storm');
    expect(earconForCategory('Volcanoes')).toBe('volcano');
    expect(earconForCategory('Sea and Lake Ice')).toBe('ice');
    expect(earconForCategory('Floods')).toBe('flood');
    const passes = eventPasses(
      [
        { id: 'b', category: 'Floods', lon: 10 },
        { id: 'a', category: 'Wildfires', lon: 10 },
        { id: 'c', category: 'Volcanoes', lon: 20 },
      ],
      2,
    );
    expect(passes[0]?.id).toBe('fire');
    for (let index = 1; index < passes.length; index += 1) {
      const prev = passes[index - 1];
      const next = passes[index];
      if (!prev || !next) continue;
      expect(next.t - prev.t).toBeGreaterThanOrEqual(1 / 3 - 1e-9);
    }
    const again = eventPasses(
      [
        { id: 'b', category: 'Floods', lon: 10 },
        { id: 'a', category: 'Wildfires', lon: 10 },
      ],
      2,
    );
    expect(JSON.stringify(passes.slice(0, 2))).toBe(JSON.stringify(again));
  });
});

function layerInput(
  id: ScoreInput['layers'][number]['config']['id'],
  values: number[],
): ScoreInput {
  return {
    mode: 'sweep',
    speed: 'normal',
    scale: 'pentatonic_major',
    tuning: 'twelve_tet',
    view: { lat: 0, lon: 0 },
    region: 'global',
    regions: { global: { lat: 0, lon: 0 } },
    time: { from: 2000, to: 2002, cursor: 2000 },
    layers: [
      {
        config: {
          id,
          timeKind: 'year',
          variables: {
            how_much: { field: 'v', range: [0, 10] },
            how_strong: { field: 'abs(v)', range: [0, 10] },
            how_fast: { field: 'delta(v)', range: [0, 5] },
            where: { field: 'region_center' },
          },
          what: { timbre: 'warm-lead', register: [48, 72], symphonyRegister: [48, 60] },
        },
        data: {
          series: { global: values.map((v, index) => ({ t: 2000 + index, v })) },
        },
      },
    ],
  };
}

describe('mapped scores', () => {
  it('plays a higher sea-ice extent at a higher pitch', () => {
    const score = buildScore(layerInput('sea_ice', [4, 7]));
    const lows = score.events.map((event) => event.freqHz);
    expect(lows).toHaveLength(2);
    expect(icePitchDescends(lows[0] ?? 0, lows[1] ?? 0)).toBe(true);
    expect(JSON.stringify(score)).toBe(JSON.stringify(buildScore(layerInput('sea_ice', [4, 7]))));
  });

  it('sounds event earcons from real markers and stays deterministic', () => {
    const input = layerInput('events', [3]);
    const layer = input.layers[0];
    if (!layer) throw new Error('missing layer');
    layer.data.markers = [
      { id: 'west', category: 'Wildfires', lon: -100 },
      { id: 'east', category: 'Severe Storms', lon: 40 },
    ];
    const score = buildScore(input);
    expect(score.events.length).toBeGreaterThan(0);
    expect(score.earcons.map((earcon) => earcon.id)).toEqual(['fire', 'storm']);
    expect(JSON.stringify(score)).toBe(JSON.stringify(buildScore(input)));
  });

  it('keeps a carbon-dioxide drone deterministic', () => {
    const score = buildScore(layerInput('co2', [320, 340, 360]));
    expect(score.events.every((event) => event.freqHz > 0)).toBe(true);
    expect(JSON.stringify(score)).toBe(
      JSON.stringify(buildScore(layerInput('co2', [320, 340, 360]))),
    );
  });
});
