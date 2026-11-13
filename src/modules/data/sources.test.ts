import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SourceCatalogSchema } from './schemas';

const REQUIRED = [
  'svs-14439',
  'svs-5151',
  'svs-5152',
  'svs-5153',
  'svs-5154',
  'svs-5518',
  'svs-5552',
  'svs-5572',
  'svs-5113',
  'geos-cf-opendap',
  'gmao-knowland-1446',
  'gmao-lucchesi-1203',
  'gmao-geos-cf',
];

describe('source catalog', () => {
  const catalog = SourceCatalogSchema.parse(
    JSON.parse(readFileSync('public/data/sources.json', 'utf8')),
  );

  it('keeps ids unique and lists the research sources', () => {
    const ids = catalog.sources.map((source) => source.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of REQUIRED) expect(ids).toContain(id);
  });

  it('points every SVS id at its item page', () => {
    for (const source of catalog.sources) {
      if (!source.id.startsWith('svs-')) continue;
      const numeric = source.id.slice('svs-'.length);
      if (!/^\d+$/.test(numeric)) continue;
      expect(source.url).toBe(`https://svs.gsfc.nasa.gov/${numeric}/`);
      expect(source.key).toBe('none');
    }
  });
});
