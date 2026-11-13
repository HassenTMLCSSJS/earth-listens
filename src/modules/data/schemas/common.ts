import * as z from 'zod';

export const LocalizedSchema = z.object({ en: z.string().min(1), ar: z.string().min(1) });
export type Localized = z.infer<typeof LocalizedSchema>;

export const TimeValue = z.union([z.number(), z.string()]);
export type TimeValue = z.infer<typeof TimeValue>;

export const CATEGORIES = [
  'climate',
  'fire',
  'ice_ocean',
  'ocean',
  'atmosphere',
  'human',
  'biosphere',
  'weather',
] as const;

export const TIMBRE_IDS = [
  'warm-lead',
  'crackle-marimba',
  'glass-bells',
  'beating-drone',
  'water-fm',
  'air-flute',
  'grain-pad',
  'low-brass',
  'thunder-perc',
  'night-bell',
  'aq-chord',
] as const;

export const PointSchema = z.object({
  t: TimeValue,
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
