import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { LayerId, RegionId } from '../src/core/actions';
import { groundTruth } from '../src/modules/quiz/truth';
import { QuizFileSchema, type Point } from '../src/modules/data/schemas';

interface Candidate {
  id: string;
  layerId: LayerId;
  region: RegionId;
  from: number;
  to: number;
  truth: 'increased' | 'decreased' | 'unchanged';
}

function windows(
  points: Point[],
  layerId: LayerId,
  region: RegionId,
  range: { min: number; max: number },
): Candidate[] {
  const years = points.flatMap((point) => (typeof point.t === 'number' ? [point.t] : []));
  const found: Candidate[] = [];
  for (let span = 4; span <= 30; span += 2) {
    for (let i = 0; i < years.length; i += 3) {
      const from = years[i];
      const to = years[i + span];
      if (from === undefined || to === undefined) continue;
      const slice = points.filter(
        (point) => typeof point.t === 'number' && point.t >= from && point.t <= to,
      );
      const truth = groundTruth(slice, range);
      found.push({ id: `${layerId}-${region}-${from}-${to}`, layerId, region, from, to, truth });
    }
  }
  return found;
}

async function main(): Promise<void> {
  const root = process.cwd();
  const temperature = JSON.parse(
    await readFile(path.join(root, 'public/data/layers/temperature.sample.json'), 'utf8'),
  ) as {
    series: { global: Point[] };
  };
  const ice = JSON.parse(
    await readFile(path.join(root, 'public/data/layers/sea_ice.sample.json'), 'utf8'),
  ) as {
    series: { global: Point[] };
  };
  const tempConfig = JSON.parse(
    await readFile(path.join(root, 'public/data/layers/temperature.config.json'), 'utf8'),
  ) as {
    variables: { how_much: { range: [number, number] } };
  };
  const iceConfig = JSON.parse(
    await readFile(path.join(root, 'public/data/layers/sea_ice.config.json'), 'utf8'),
  ) as {
    variables: { how_much: { range: [number, number] } };
  };
  const tempRange = {
    min: tempConfig.variables.how_much.range[0],
    max: tempConfig.variables.how_much.range[1],
  };
  const iceRange = {
    min: iceConfig.variables.how_much.range[0],
    max: iceConfig.variables.how_much.range[1],
  };
  const pool = [
    ...windows(temperature.series.global, 'temperature', 'global', tempRange),
    ...windows(ice.series.global, 'sea_ice', 'arctic', iceRange),
  ];
  const pick = (truth: Candidate['truth'], count: number, used: Set<string>) => {
    const chosen: Candidate[] = [];
    for (const item of pool) {
      if (item.truth !== truth || used.has(item.id)) continue;
      used.add(item.id);
      chosen.push({ ...item, id: `sample-${String(used.size).padStart(2, '0')}` });
      if (chosen.length === count) break;
    }
    return chosen;
  };
  const used = new Set<string>();
  const trainingSource = pool.find((item) => item.truth === 'increased');
  if (!trainingSource) throw new Error('no training clip');
  used.add(trainingSource.id);
  const clips = [
    ...pick('unchanged', 2, used),
    ...pick('increased', 4, used),
    ...pick('decreased', 4, used),
  ];
  if (clips.length !== 10)
    throw new Error(
      `expected 10 clips, got ${clips.length}: ${clips.map((c) => c.truth).join(',')}`,
    );
  const truths = new Set(clips.map((clip) => clip.truth));
  if (truths.size < 3) throw new Error('clips must cover every answer');
  const file = QuizFileSchema.parse({
    sample: true,
    training: { ...trainingSource, id: 'sample-training' },
    clips,
  });
  const dest = path.join(root, 'public/data/quiz/clips.sample.json');
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, `${JSON.stringify(file, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
