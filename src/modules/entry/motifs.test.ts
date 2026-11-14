import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { closingLine } from './config';
import { INTRO_CUES } from './cues';
import { co2Motif, forestMotif, movingAverage, temperatureMotif } from './motifs';

describe('intro motifs', () => {
  it('picks the default closing line until Hassan changes it', () => {
    expect(closingLine()).toBe('intro.l7');
    expect(closingLine('alt')).toBe('intro.l7_alt');
    expect(INTRO_CUES.map((cue) => cue.id)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']);
  });

  it('turns the real temperature series into a deterministic rising motif', () => {
    const data = JSON.parse(readFileSync('public/data/layers/temperature.json', 'utf8')) as {
      series: { global: { v: number | null }[] };
    };
    const values = data.series.global.flatMap((point) =>
      typeof point.v === 'number' ? [point.v] : [],
    );
    const notes = temperatureMotif(values);
    expect(notes.length).toBe(values.length);
    expect(temperatureMotif(values)).toEqual(notes);
    const average = movingAverage(
      notes.map((note) => note.pitch),
      10,
    );
    expect(average.at(-1) ?? 0).toBeGreaterThan(average[0] ?? 0);
    expect(forestMotif([10, 20])).toHaveLength(2);
    expect(co2Motif([315, 427])[1]?.pitch).toBeGreaterThan(co2Motif([315, 427])[0]?.pitch ?? 0);
  });
});
