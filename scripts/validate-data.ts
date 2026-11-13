import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { LAYER_IDS } from '../src/core/actions';
import {
  AssetManifestSchema,
  LayerConfigSchema,
  LayerDataSchema,
  QuizFileSchema,
  RegistrySchema,
  RegionsFileSchema,
  SourceCatalogSchema,
  ViewSchema,
  sourcesOf,
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
    LayerConfigSchema.parse(await readJson(path.join(process.cwd(), 'public', layer.config)));
    const dataFile = path.join(process.cwd(), 'public', layer.data);
    const data = LayerDataSchema.parse(await readJson(dataFile));
    const sampleName = path.basename(dataFile).endsWith('.sample.json');
    if (data.sample !== sampleName)
      throw new Error(`${dataFile} sample flag must match the file name`);
    if (!data.sample) {
      for (const source of sourcesOf(data.source)) {
        if (!source.retrieved || !source.sha256) {
          throw new Error(`${dataFile} real data needs retrieved and sha256`);
        }
      }
    }
    if (layer.view) {
      const view = ViewSchema.parse(await readJson(path.join(process.cwd(), 'public', layer.view)));
      if (view.credit.length === 0) throw new Error(`${layer.id} view needs a credit`);
    }
    for (const frame of data.frames) {
      if (!frame.value) continue;
      await access(path.join(process.cwd(), 'public', frame.value));
    }
  }

  await access(path.join(root, 'assets.manifest.json'))
    .then(() =>
      readJson(path.join(root, 'assets.manifest.json')).then((json) =>
        AssetManifestSchema.parse(json),
      ),
    )
    .catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
      throw error;
    });
  await access(path.join(root, 'sources.json'))
    .then(() =>
      readJson(path.join(root, 'sources.json')).then((json) => SourceCatalogSchema.parse(json)),
    )
    .catch((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return;
      throw error;
    });

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
