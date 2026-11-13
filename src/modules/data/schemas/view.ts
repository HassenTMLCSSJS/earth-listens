import * as z from 'zod';
import { LAYER_IDS } from '@/core/actions';
import { LocalizedSchema } from './common';
import { TimeValue } from './common';

export const RampSchema = z.object({
  id: z.string().min(1),
  src: z.string().min(1),
  domain: z.tuple([z.number(), z.number()]),
  unit: LocalizedSchema,
  kind: z.enum(['sequential', 'diverging', 'categorical']),
  classes: z
    .array(
      z.object({
        value: z.number(),
        label: LocalizedSchema,
        rgb: z.tuple([z.number(), z.number(), z.number()]),
      }),
    )
    .optional(),
  source: z.string().url(),
});
export type Ramp = z.infer<typeof RampSchema>;

export const CameraPresetSchema = z.object({
  id: z.string().min(1),
  label: LocalizedSchema,
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  alt: z.number().min(1.1).max(6),
});

export const ViewSchema = z.object({
  id: z.union([z.enum(LAYER_IDS), z.literal('home')]),
  base: z.enum(['earth-day', 'earth-relief-bathy', 'earth-night']),
  baseDim: z.number().min(0).max(1).default(0),
  night: z.boolean().default(true),
  height: z
    .object({
      src: z.string().min(1),
      offset: z.number(),
      scale: z.number().positive(),
      exaggeration: z.number(),
      canopy: z.object({ src: z.string(), exaggeration: z.number() }).optional(),
    })
    .nullable(),
  overlay: z
    .object({
      kind: z.enum(['value', 'video', 'points', 'baked']),
      mask: z.enum(['none', 'water', 'land']).default('none'),
      src: z.string().optional(),
      ramp: RampSchema.nullable(),
      opacity: z.number().min(0).max(1).default(0.85),
    })
    .nullable(),
  cameras: z.array(CameraPresetSchema).min(1),
  beforeAfter: z
    .object({
      a: TimeValue,
      b: TimeValue,
      mode: z.enum(['wipe', 'radial', 'toggle']),
    })
    .nullable(),
  transitionMs: z.number().int().default(900),
  credit: z.array(z.string().min(1)).min(1),
  note: z.string().optional(),
});
export type GlobeView = z.infer<typeof ViewSchema>;
