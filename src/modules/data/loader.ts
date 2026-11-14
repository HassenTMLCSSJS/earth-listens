import {
  LayerConfigSchema,
  LayerDataSchema,
  RegistrySchema,
  type LayerConfig,
  type LayerData,
  type LoadedLayer,
  type Registry,
} from './schemas';
import type { LayerId } from '@/core/actions';

export interface LayerRegistry {
  /** Registry entries, including each layer's optional live-feed descriptor. */
  list(): Registry['layers'];
  get(id: LayerId): Promise<LoadedLayer>;
}

async function read(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${url}`);
  return response.json();
}

export async function loadJson<T>(url: string, schema: { parse(input: unknown): T }): Promise<T> {
  return schema.parse(await read(url));
}

export async function loadRegistry(base = ''): Promise<LayerRegistry> {
  const registry: Registry = RegistrySchema.parse(await read(`${base}/data/registry.json`));
  const cache = new Map<LayerId, LoadedLayer>();
  return {
    list: () => registry.layers,
    async get(id) {
      const cached = cache.get(id);
      if (cached) return cached;
      const entry = registry.layers.find((layer) => layer.id === id);
      if (!entry) throw new Error(`Unknown layer ${id}`);
      const config: LayerConfig = LayerConfigSchema.parse(await read(`${base}${entry.config}`));
      const data: LayerData = LayerDataSchema.parse(await read(`${base}${entry.data}`));
      const loaded = { config, data, isSample: data.sample === true };
      cache.set(id, loaded);
      return loaded;
    },
  };
}
