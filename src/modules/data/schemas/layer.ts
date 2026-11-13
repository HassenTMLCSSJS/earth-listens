import * as z from 'zod';
import { LAYER_IDS, REGION_IDS, SCALE_IDS } from '@/core/actions';
import { CATEGORIES, LocalizedSchema, PointSchema, TIMBRE_IDS, VariableSchema } from './common';
import { FrameSchema, timesIncrease } from './frame';
import { GridMetaSchema } from './grid';
import { SourceListSchema, sourcesOf } from './source';

export const LayerConfigSchema = z.object({
  id: z.enum(LAYER_IDS),
  category: z.enum(CATEGORIES),
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
    timbre: z.enum(TIMBRE_IDS),
    register: z.tuple([z.number(), z.number()]),
    symphonyRegister: z.tuple([z.number(), z.number()]),
    timbreBySpecies: z.record(z.string(), z.enum(TIMBRE_IDS)).optional(),
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

export const SpeciesSchema = z.object({
  id: z.string().min(1),
  label: LocalizedSchema,
  timbre: z.enum(TIMBRE_IDS),
});

export const LayerDataSchema = z
  .object({
    id: z.enum(LAYER_IDS),
    sample: z.boolean(),
    title: LocalizedSchema,
    unit: LocalizedSchema,
    source: SourceListSchema,
    range: z.object({ min: z.number(), max: z.number() }),
    series: z.record(z.enum(REGION_IDS), z.array(PointSchema)),
    annual: z.array(PointSchema).nullable(),
    cells: z.array(CellSchema).nullable(),
    seasonalAmplitude: z.array(PointSchema).nullable(),
    frames: z.array(FrameSchema),
    events: z.array(z.object({ t: z.union([z.number(), z.string()]), label: LocalizedSchema })),
    description: LocalizedSchema,
    grid: GridMetaSchema.optional(),
    variables: z.record(z.string(), z.array(PointSchema)).optional(),
    species: z.array(SpeciesSchema).optional(),
  })
  .superRefine((data, ctx) => {
    for (const [region, points] of Object.entries(data.series)) {
      if (!timesIncrease(points.map((point) => point.t))) {
        ctx.addIssue({ code: 'custom', message: `${region} times must strictly increase` });
      }
    }
    if (!timesIncrease(data.frames.map((frame) => frame.t))) {
      ctx.addIssue({ code: 'custom', message: 'frames[].t must strictly increase' });
    }
    const sources = sourcesOf(data.source);
    if (!data.sample && data.id === 'wildfire' && sources.some((source) => !source.ack)) {
      ctx.addIssue({ code: 'custom', message: 'wildfire source.ack is required for real data' });
    }
    if (!data.sample) {
      for (const source of sources) {
        if (!source.retrieved || !source.sha256) {
          ctx.addIssue({
            code: 'custom',
            message: 'sample:false requires source.retrieved and source.sha256',
          });
        }
      }
    }
    for (const frame of data.frames) {
      if (frame.sample !== undefined && frame.sample !== data.sample) {
        ctx.addIssue({
          code: 'custom',
          message: 'frames[].sample must match the file sample flag',
        });
      }
    }
    if (data.grid && data.grid.bins.length > 256) {
      ctx.addIssue({ code: 'custom', message: 'grid.bins.length must be <= 256' });
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
      view: z.string().optional(),
      live: z
        .object({
          feed: z.string().min(1),
          params: z.record(z.string(), z.string()).optional(),
          revalidate: z.number().int().positive(),
        })
        .optional(),
      sources: z.array(z.string()).optional(),
      historicalOnly: z.boolean().optional(),
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
