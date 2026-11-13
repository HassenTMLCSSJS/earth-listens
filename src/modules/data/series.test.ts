import { describe, expect, it } from 'vitest';
import { areaWeightedMean, fireCell } from './series';

describe('series helpers', () => {
  it('area-weights by cosine of latitude', () => {
    expect(areaWeightedMean([0, 60], [1, 3])).toBeCloseTo(1.666667, 4);
    expect(areaWeightedMean([0, 10], [null, null])).toBeNull();
  });

  it('bins fires onto the 5° grid', () => {
    expect(fireCell(37.9, 23.4)).toEqual({ lat: 37.5, lon: 22.5 });
    expect(fireCell(-0.1, -0.1)).toEqual({ lat: -2.5, lon: -2.5 });
    expect(fireCell(0, 0)).toEqual({ lat: 2.5, lon: 2.5 });
    expect(fireCell(90, 180)).toEqual({ lat: 87.5, lon: 177.5 });
    expect(fireCell(-90, -180)).toEqual({ lat: -87.5, lon: -177.5 });
    expect(fireCell(30.05, 31.25)).toEqual({ lat: 32.5, lon: 32.5 });
  });
});
