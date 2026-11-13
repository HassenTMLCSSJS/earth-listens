import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as z from 'zod';
import {
  LayerConfigSchema,
  LayerDataSchema,
  QuizFileSchema,
  RegistrySchema,
  RegionsFileSchema,
} from '../src/modules/data/schemas';

const schemas = {
  'layer-config.schema.json': LayerConfigSchema,
  'layer-data.schema.json': LayerDataSchema,
  'registry.schema.json': RegistrySchema,
  'regions.schema.json': RegionsFileSchema,
  'quiz.schema.json': QuizFileSchema,
} as const;

async function main(): Promise<void> {
  const dir = path.join(process.cwd(), 'pipeline/earth_pipeline/schemas');
  await mkdir(dir, { recursive: true });
  for (const [name, schema] of Object.entries(schemas)) {
    const json = z.toJSONSchema(schema);
    await writeFile(path.join(dir, name), `${JSON.stringify(json, null, 2)}\n`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
