import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import ar from '../../messages/ar.json';
import { groundTruth } from '@/modules/quiz';

function keys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('messages and sample quiz', () => {
  it('keeps English and Arabic keys aligned', () => {
    expect(keys(en).sort()).toEqual(keys(ar).sort());
  });

  it('recomputes every SAMPLE quiz truth', () => {
    const quiz = JSON.parse(readFileSync('public/data/quiz/clips.sample.json', 'utf8')) as {
      training: { layerId: string; region: string; from: number; to: number; truth: string };
      clips: { layerId: string; region: string; from: number; to: number; truth: string }[];
    };
    const truths = new Set<string>();
    for (const clip of [quiz.training, ...quiz.clips]) {
      const data = JSON.parse(
        readFileSync(`public/data/layers/${clip.layerId}.sample.json`, 'utf8'),
      ) as {
        series: Record<string, { t: number | string; v: number | null }[]>;
      };
      const config = JSON.parse(
        readFileSync(`public/data/layers/${clip.layerId}.config.json`, 'utf8'),
      ) as {
        variables: { how_much: { range: [number, number] } };
      };
      const series = data.series[clip.region] ?? data.series.global ?? [];
      const slice = series.filter(
        (point) => typeof point.t === 'number' && point.t >= clip.from && point.t <= clip.to,
      );
      const truth = groundTruth(slice, {
        min: config.variables.how_much.range[0],
        max: config.variables.how_much.range[1],
      });
      expect(truth).toBe(clip.truth);
      truths.add(clip.truth);
    }
    expect(truths.has('increased')).toBe(true);
    expect(truths.has('decreased')).toBe(true);
    expect(truths.has('unchanged')).toBe(true);
    expect(quiz.clips.filter((clip) => clip.truth === 'unchanged').length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it('refuses a recorded narration slot with no file', () => {
    const manifest = JSON.parse(readFileSync('public/audio/narration/manifest.json', 'utf8')) as {
      items: {
        id: string;
        en: { status: string; file: string };
        ar: { status: string; file: string };
      }[];
    };
    for (const item of manifest.items) {
      for (const side of [item.en, item.ar]) {
        if (side.status === 'recorded') {
          expect(readFileSync(`public${side.file}`).byteLength).toBeGreaterThan(0);
        }
      }
    }
    expect(manifest.items.length).toBeGreaterThan(10);
  });
});
