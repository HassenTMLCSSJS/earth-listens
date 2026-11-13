import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { SCALE_IDS, TUNINGS, type ScaleId, type TuningMode } from '@/core/actions';
import {
  bpmForRate,
  changeRate,
  clampMasterDb,
  combineGain,
  dbToLinear,
  midiFromNorm,
  midiToHz,
  normalizeMinMax,
  normalizeRobust,
  percentileLinear,
  periodForRate,
  quantize,
  robustBounds,
  scaleGrid,
  spatialize,
  strengthDb,
  ticksForRate,
  voiceCountDb,
} from '@/modules/sonification';

describe('normalization', () => {
  const range = [-0.6, 1.4] as const;
  const cases: [number | null, number | null, boolean][] = [
    [0, 0.3, false],
    [-0.18, 0.21, false],
    [1.19, 0.895, false],
    [1.4, 1, false],
    [2, 1, true],
    [-1, 0, true],
  ];

  it.each(cases)('minmax %s', (value, n, outOfRange) => {
    const result = normalizeMinMax(value, range[0], range[1]);
    expect(result.n).toBeCloseTo(n ?? 0, 4);
    expect(result.outOfRange).toBe(outOfRange);
  });

  it('treats null, NaN and infinity as gaps', () => {
    for (const value of [null, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(normalizeMinMax(value, range[0], range[1]).n).toBeNull();
    }
  });

  it('maps a constant range to 0.5', () => {
    expect(normalizeMinMax(7, 1, 1).n).toBe(0.5);
  });

  it('computes Hyndman–Fan type 7 robust bounds', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
    const { lo, hi } = robustBounds(values, 5, 95);
    expect(lo).toBeCloseTo(1.45, 4);
    expect(hi).toBeCloseTo(59.05, 4);
    expect(
      percentileLinear(
        [...values].sort((a, b) => a - b),
        5,
      ),
    ).toBeCloseTo(1.45, 4);
    expect(normalizeRobust(50, values, 5, 95).n).toBeCloseTo(0.842882, 4);
    expect(normalizeRobust(5, values, 5, 95).n).toBeCloseTo(0.061632, 4);
    expect(normalizeRobust(4, [4], 5, 95).n).toBe(0.5);
  });
});

describe('pitch', () => {
  const register = [48, 84] as const;
  const rows: [number, number, number][] = [
    [0, 48, 130.8128],
    [0.21, 55.56, 202.4413],
    [0.3, 58.8, 244.1053],
    [0.5, 66, 369.9944],
    [0.895, 80.22, 841.2319],
    [1, 84, 1046.5023],
  ];

  it.each(rows)('n %s', (n, midi, hz) => {
    const raw = midiFromNorm(n, register);
    expect(raw).toBeCloseTo(midi, 4);
    expect(midiToHz(raw)).toBeCloseTo(hz, 4);
  });

  it('maps midi 69 to 440 Hz exactly', () => {
    expect(midiToHz(69)).toBe(440);
  });

  it('quantizes the reference table', () => {
    const table: Record<number, Record<string, number>> = {
      47: {
        pentatonic_major: 48,
        major: 48,
        chromatic: 48,
        maqam_rast: 48,
        maqam_bayati: 48,
        maqam_hijaz: 48,
        maqam_nahawand: 48,
      },
      49: {
        pentatonic_major: 48,
        major: 48,
        chromatic: 49,
        maqam_rast: 48,
        maqam_bayati: 48,
        maqam_hijaz: 48,
        maqam_nahawand: 48,
      },
      51: {
        pentatonic_major: 50,
        major: 50,
        chromatic: 51,
        maqam_rast: 51.5,
        maqam_bayati: 51.5,
        maqam_hijaz: 51,
        maqam_nahawand: 51,
      },
      55.56: {
        pentatonic_major: 55,
        major: 55,
        chromatic: 56,
        maqam_rast: 55,
        maqam_bayati: 55,
        maqam_hijaz: 55,
        maqam_nahawand: 56,
      },
      58.8: {
        pentatonic_major: 60,
        major: 59,
        chromatic: 59,
        maqam_rast: 58.5,
        maqam_bayati: 58,
        maqam_hijaz: 58,
        maqam_nahawand: 59,
      },
      59.25: {
        pentatonic_major: 60,
        major: 59,
        chromatic: 59,
        maqam_rast: 58.5,
        maqam_bayati: 60,
        maqam_hijaz: 60,
        maqam_nahawand: 59,
      },
      84: {
        pentatonic_major: 84,
        major: 84,
        chromatic: 84,
        maqam_rast: 84,
        maqam_bayati: 84,
        maqam_hijaz: 84,
        maqam_nahawand: 84,
      },
    };
    const tet: Record<number, Record<string, number>> = {
      51: { maqam_rast: 50, maqam_bayati: 51 },
      55.56: { maqam_rast: 55, maqam_bayati: 55 },
      58.8: { maqam_rast: 58, maqam_bayati: 58 },
      59.25: { maqam_rast: 60, maqam_bayati: 60 },
    };
    for (const [rawText, row] of Object.entries(table)) {
      const raw = Number(rawText);
      for (const [scale, midi] of Object.entries(row)) {
        expect(quantize(raw, scale as ScaleId, 'microtonal', register)).toBeCloseTo(midi, 4);
      }
    }
    for (const [rawText, row] of Object.entries(tet)) {
      const raw = Number(rawText);
      expect(quantize(raw, 'maqam_rast', 'twelve_tet', register)).toBeCloseTo(
        row.maqam_rast ?? 0,
        4,
      );
      expect(quantize(raw, 'maqam_bayati', 'twelve_tet', register)).toBeCloseTo(
        row.maqam_bayati ?? 0,
        4,
      );
    }
    for (const raw of [47, 49, 84]) {
      expect(quantize(raw, 'maqam_rast', 'twelve_tet', register)).toBeCloseTo(
        raw === 84 ? 84 : 48,
        4,
      );
      expect(quantize(raw, 'maqam_bayati', 'twelve_tet', register)).toBeCloseTo(
        raw === 84 ? 84 : 48,
        4,
      );
    }
  });

  it('builds the reference grids from 48 to 62', () => {
    const between = (scale: ScaleId, tuning: TuningMode) =>
      scaleGrid(scale, tuning, [48, 84]).filter((note) => note >= 48 && note <= 62);
    expect(between('maqam_rast', 'microtonal')).toEqual([48, 50, 51.5, 53, 55, 57, 58.5, 60, 62]);
    expect(between('maqam_bayati', 'microtonal')).toEqual([48, 50, 51.5, 53, 55, 57, 58, 60, 62]);
    expect(between('maqam_hijaz', 'microtonal')).toEqual([48, 50, 51, 54, 55, 57, 58, 60, 62]);
    expect(between('maqam_nahawand', 'microtonal')).toEqual([48, 50, 51, 53, 55, 56, 59, 60, 62]);
    expect(midiToHz(58.5)).toBeCloseTo(239.9117, 4);
    expect(midiToHz(51.5)).toBeCloseTo(160.1219, 4);
  });

  it('keeps quantized pitch monotone for every scale and tuning', () => {
    for (const scale of SCALE_IDS) {
      for (const tuning of TUNINGS) {
        fc.assert(
          fc.property(
            fc.array(fc.double({ min: -2, max: 3, noNaN: true, noDefaultInfinity: true }), {
              minLength: 1,
              maxLength: 24,
            }),
            (values) => {
              const sorted = values.slice().sort((a, b) => a - b);
              const freqs = sorted.map((value) => {
                const n = normalizeMinMax(value, -0.6, 1.4).n ?? 0;
                const midi = quantize(midiFromNorm(n, [48, 84]), scale, tuning, [48, 84]);
                return midiToHz(midi);
              });
              for (let i = 1; i < freqs.length; i += 1) {
                if ((freqs[i] ?? 0) + 1e-9 < (freqs[i - 1] ?? 0)) return false;
              }
              return true;
            },
          ),
          { numRuns: 1000 },
        );
      }
    }
  });
});

describe('spatial', () => {
  const cases: [number, number, number, number, number, number, number, number, number][] = [
    [0, -90, 0, 0, -1, 0, 0, 0, 20000],
    [0, 0, 0, 0, 0, 0, 1, 0, 20000],
    [0, 90, 0, 0, 1, 0, 0, 0, 20000],
    [0, 30, 0, 0, 0.5, 0, 0.866025, 0, 20000],
    [0, 135, 0, 0, 0.707107, 0, -0.707107, -6.364, 2053.7006],
    [0, 180, 0, 0, 0, 0, -1, -9, 800],
    [0, -170, 0, 170, 0.34202, 0, 0.939693, 0, 20000],
    [60, 0, 0, 0, 0, 0.866025, 0.5, 0, 20000],
    [26.8, 30.8, 0, 0, 0.457042, 0.450878, 0.766695, 0, 20000],
    [30, 31, 30, 31, 0, 0, 1, 0, 20000],
  ];

  it.each(cases)(
    'voice (%s,%s) view (%s,%s)',
    (lat, lon, viewLat, viewLon, x, y, z, back, lowpass) => {
      const spatial = spatialize(lat, lon, viewLat, viewLon);
      expect(spatial.x).toBeCloseTo(x, 4);
      expect(spatial.y).toBeCloseTo(y, 4);
      expect(spatial.z).toBeCloseTo(z, 4);
      expect(spatial.pos).toEqual({ x: spatial.x, y: spatial.y, z: -spatial.z });
      expect(spatial.pan).toBeCloseTo(x, 4);
      expect(spatial.backDb).toBeCloseTo(back, 3);
      expect(spatial.lowpassHz).toBeCloseTo(lowpass, 2);
    },
  );

  it('pans west, centre and east', () => {
    expect(spatialize(0, -90, 0, 0).pan).toBeLessThan(0);
    expect(spatialize(0, 0, 0, 0).pan).toBeCloseTo(0, 6);
    expect(spatialize(0, 90, 0, 0).pan).toBeGreaterThan(0);
  });
});

describe('volume and rhythm', () => {
  it('maps strength to the safe ceiling', () => {
    const rows: [number, number, number][] = [
      [0, -30, 0.031623],
      [0.25, -24, 0.063096],
      [0.5, -18, 0.125893],
      [1, -6, 0.501187],
    ];
    for (const [n, db, linear] of rows) {
      expect(strengthDb(n)).toBeCloseTo(db, 4);
      expect(dbToLinear(strengthDb(n))).toBeCloseTo(linear, 4);
    }
  });

  it('keeps summed voice power constant', () => {
    expect(voiceCountDb(1)).toBeCloseTo(0, 4);
    expect(voiceCountDb(2)).toBeCloseTo(-3.0103, 4);
    expect(voiceCountDb(4)).toBeCloseTo(-6.0206, 4);
    expect(voiceCountDb(24)).toBeCloseTo(-13.8021, 4);
  });

  it('never lets gain or master volume exceed the ceiling', () => {
    expect(combineGain(0, 0, 0, 0)).toBe(-6);
    expect(combineGain(-30, 0, 0, 0)).toBe(-30);
    expect(clampMasterDb(5)).toBe(0);
    expect(clampMasterDb(-6)).toBe(-6);
  });

  it('maps rate to ticks, bpm and period', () => {
    const rows: [number, number, number, number][] = [
      [0, 1, 60, 1],
      [0.25, 2, 90, 0.666667],
      [0.5, 3, 120, 0.5],
      [1, 4, 180, 0.333333],
    ];
    for (const [r, ticks, bpm, period] of rows) {
      expect(ticksForRate(r)).toBe(ticks);
      expect(bpmForRate(r)).toBeCloseTo(bpm, 4);
      expect(periodForRate(r)).toBeCloseTo(period, 4);
    }
    expect(changeRate(0.12, [-0.3, 0.3])).toBeCloseTo(0.4, 4);
    expect(ticksForRate(changeRate(0.12, [-0.3, 0.3]))).toBe(2);
    expect(changeRate(null, [-0.3, 0.3])).toBe(0);
  });
});

describe('CO2 register', () => {
  const register = [36, 43] as const;
  it('maps 315 ppm and 427 ppm', () => {
    const low = normalizeMinMax(315, 310, 440);
    expect(low.n).toBeCloseTo(0.038462, 4);
    const lowRaw = midiFromNorm(low.n ?? 0, register);
    expect(lowRaw).toBeCloseTo(36.269231, 4);
    expect(quantize(lowRaw, 'pentatonic_major', 'microtonal', register)).toBeCloseTo(36, 4);
    expect(midiToHz(36)).toBeCloseTo(65.4064, 4);

    const high = normalizeMinMax(427, 310, 440);
    expect(high.n).toBeCloseTo(0.9, 4);
    const highRaw = midiFromNorm(high.n ?? 0, register);
    expect(highRaw).toBeCloseTo(42.3, 4);
    expect(quantize(highRaw, 'pentatonic_major', 'microtonal', register)).toBeCloseTo(43, 4);
    expect(midiToHz(43)).toBeCloseTo(97.9989, 4);
  });
});
