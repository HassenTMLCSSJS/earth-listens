import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { LAYER_IDS } from '../src/core/actions';
import {
  LayerConfigSchema,
  LayerDataSchema,
  QuizFileSchema,
  RegistrySchema,
  RegionsFileSchema,
} from '../src/modules/data/schemas';

async function main(): Promise<void> {
  const root = path.join(process.cwd(), 'public/data');

  async function readJson(file: string): Promise<unknown> {
    return JSON.parse(await readFile(file, 'utf8'));
  }

  const registry = RegistrySchema.parse(await readJson(path.join(root, 'registry.json')));
  const ids = registry.layers.map((layer) => layer.id);
  if (ids.length !== LAYER_IDS.length || LAYER_IDS.some((id) => !ids.includes(id))) {
    throw new Error(`registry ids ${ids.join(',')} do not match the layer union`);
  }
  for (const layer of registry.layers) {
    if (!layer.data.endsWith('.sample.json'))
      throw new Error(`${layer.id} registry data must be a sample file in the base MVP`);
    LayerConfigSchema.parse(await readJson(path.join(process.cwd(), 'public', layer.config)));
    const dataFile = path.join(process.cwd(), 'public', layer.data);
    const data = LayerDataSchema.parse(await readJson(dataFile));
    const sampleName = path.basename(dataFile).endsWith('.sample.json');
    if (data.sample !== sampleName)
      throw new Error(`${dataFile} sample flag must match the file name`);
    if (data.sample !== true) throw new Error(`${dataFile} must be marked sample`);
  }

  RegionsFileSchema.parse(await readJson(path.join(root, 'regions.json')));
  QuizFileSchema.parse(await readJson(path.join(root, 'quiz/clips.sample.json')));

  const files = await readdir(path.join(root, 'layers'));
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const full = path.join(root, 'layers', file);
    const json = (await readJson(full)) as { sample?: boolean };
    if (file.endsWith('.sample.json') && json.sample !== true)
      throw new Error(`${file} must have sample true`);
    if (
      !file.endsWith('.sample.json') &&
      file.endsWith('.json') &&
      'sample' in json &&
      json.sample === true
    ) {
      throw new Error(`${file} is sample data with the wrong file name`);
    }
  }

  console.log('SAMPLE data validated');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
