import * as z from 'zod';
import { LAYER_IDS, REGION_IDS, SCALE_IDS } from '@/core/actions';

export const LocalizedSchema = z.object({ en: z.string().min(1), ar: z.string().min(1) });
export type Localized = z.infer<typeof LocalizedSchema>;

export const PointSchema = z.object({
  t: z.union([z.number(), z.string()]),
  v: z.number().nullable(),
  q: z.enum(['ok', 'missing', 'estimated']),
});
export type Point = z.infer<typeof PointSchema>;

const RangeSchema = z.tuple([z.number(), z.number()]).refine((pair) => pair[0] <= pair[1], {
  message: 'range min must be <= max',
});

export const VariableSchema = z.object({
  field: z.string().min(1),
  range: RangeSchema,
  normalize: z
    .object({
      method: z.enum(['minmax', 'robust']),
      p: z.tuple([z.number(), z.number()]).optional(),
    })
    .optional(),
});

export const LayerConfigSchema = z.object({
  id: z.enum(LAYER_IDS),
  category: z.enum(['climate', 'fire', 'ice_ocean']),
  title: LocalizedSchema,
  unit: LocalizedSchema,
  timeKind: z.enum(['year', 'day']),
  eic: z.object({ page: z.string().url(), frames: z.string() }),
  variables: z.object({
    how_much: VariableSchema,
    how_strong: VariableSchema,
    how_fast: VariableSchema,
    where: z.object({ field: z.string().min(1) }),
    seasonalAmplitude: VariableSchema.optional(),
  }),
  what: z.object({
    timbre: z.enum(['warm-lead', 'crackle-marimba', 'glass-bells', 'beating-drone']),
    register: z.tuple([z.number(), z.number()]),
    symphonyRegister: z.tuple([z.number(), z.number()]),
  }),
  scale: z.enum(SCALE_IDS),
  regions: z.array(z.enum(REGION_IDS)).min(1),
  symphony: z.object({ role: z.string(), from: z.number(), to: z.number() }),
});
export type LayerConfig = z.infer<typeof LayerConfigSchema>;

export const CellSchema = z.object({
  t: z.string(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  count: z.number().min(0),
  frp_mean: z.number(),
});

export const LayerDataSchema = z
  .object({
    id: z.enum(LAYER_IDS),
    sample: z.boolean(),
    title: LocalizedSchema,
    unit: LocalizedSchema,
    source: z.object({
      name: z.string(),
      dataset_url: z.string(),
      eic_page: z.string(),
      retrieved: z.string().nullable(),
      sha256: z.string().nullable(),
      citation: z.string(),
      ack: z.string().nullable(),
    }),
    range: z.object({ min: z.number(), max: z.number() }),
    series: z.record(z.enum(REGION_IDS), z.array(PointSchema)),
    annual: z.array(PointSchema).nullable(),
    cells: z.array(CellSchema).nullable(),
    seasonalAmplitude: z.array(PointSchema).nullable(),
    frames: z.array(z.object({ t: z.union([z.number(), z.string()]), src: z.string() })),
    events: z.array(z.object({ t: z.union([z.number(), z.string()]), label: LocalizedSchema })),
    description: LocalizedSchema,
  })
  .superRefine((data, ctx) => {
    for (const [region, points] of Object.entries(data.series)) {
      let prev: number | string | null = null;
      for (const point of points) {
        if (prev !== null && String(point.t) <= String(prev)) {
          ctx.addIssue({ code: 'custom', message: `${region} times must strictly increase` });
          break;
        }
        prev = point.t;
      }
    }
    if (!data.sample && data.id === 'wildfire' && !data.source.ack) {
      ctx.addIssue({ code: 'custom', message: 'wildfire source.ack is required for real data' });
    }
  });
export type LayerData = z.infer<typeof LayerDataSchema>;

export const RegistrySchema = z.object({
  version: z.literal(1),
  layers: z.array(
    z.object({
      id: z.enum(LAYER_IDS),
      config: z.string(),
      data: z.string(),
    }),
  ),
});
export type Registry = z.infer<typeof RegistrySchema>;

export const RegionSchema = z.object({
  id: z.enum(REGION_IDS),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  centre: z.tuple([z.number(), z.number()]),
  label: LocalizedSchema,
});
export type Region = z.infer<typeof RegionSchema>;

export const RegionsFileSchema = z.object({ regions: z.array(RegionSchema) });

export const QuizClipSchema = z.object({
  id: z.string(),
  layerId: z.enum(LAYER_IDS),
  region: z.enum(REGION_IDS),
  from: z.number(),
  to: z.number(),
  truth: z.enum(['increased', 'decreased', 'unchanged']),
});
export type QuizClip = z.infer<typeof QuizClipSchema>;

export const QuizFileSchema = z.object({
  sample: z.literal(true),
  training: QuizClipSchema,
  clips: z.array(QuizClipSchema).length(10),
});
export type QuizFile = z.infer<typeof QuizFileSchema>;

export interface LoadedLayer {
  config: LayerConfig;
  data: LayerData;
  isSample: boolean;
}

export const ExplanationSchema = z.object({
  id: z.enum(LAYER_IDS),
  level: z.enum(['short', 'detailed']),
  text: LocalizedSchema,
});
