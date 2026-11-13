import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LAYER_IDS } from '@/core/actions';
import {
  EARCON_LABELS,
  NARRATION_IDS,
  collectNarrationLines,
  type NarrationLine,
} from '@/modules/narration';
import { EARCONS } from '@/modules/sonification';

function linesFromRepo(): NarrationLine[] {
  const explanations = JSON.parse(readFileSync('public/data/explanations/all.json', 'utf8')) as {
    items: { id: string; level: 'short' | 'detailed'; text: { en: string; ar: string } }[];
  };
  const regions = JSON.parse(readFileSync('public/data/regions.json', 'utf8')) as {
    regions: { id: string; centre: [number, number]; label: { en: string; ar: string } }[];
  };
  return collectNarrationLines({
    explanations: explanations.items,
    regions: regions.regions,
  });
}

describe('fixed narration lines', () => {
  it('covers scripts, explanations, regions, and earcon labels in both languages', () => {
    const lines = linesFromRepo();
    for (const id of NARRATION_IDS) {
      expect(
        lines.some((line) => line.id === id && line.lang === 'en' && line.kind === 'script'),
      ).toBe(true);
      expect(lines.some((line) => line.id === id && line.lang === 'ar')).toBe(true);
    }
    for (const id of LAYER_IDS) {
      expect(lines.some((line) => line.id === `${id}.short` && line.lang === 'ar')).toBe(true);
      expect(lines.some((line) => line.id === `${id}.detailed` && line.lang === 'en')).toBe(true);
    }
    expect(lines.some((line) => line.id === 'region.egypt' && line.text.includes('26.8'))).toBe(
      true,
    );
    expect(Object.keys(EARCON_LABELS).sort()).toEqual(Object.keys(EARCONS).sort());
    expect(lines.filter((line) => line.kind === 'earcon')).toHaveLength(
      Object.keys(EARCONS).length * 2,
    );
    const committed = JSON.parse(readFileSync('public/data/narration.sources.json', 'utf8')) as {
      lines: NarrationLine[];
    };
    expect(committed.lines).toEqual(lines);
  });
});
