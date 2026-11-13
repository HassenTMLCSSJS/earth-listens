import * as z from 'zod';

export const GridBinSchema = z.object({
  lo: z.number().nullable(),
  hi: z.number().nullable(),
  mid: z.number().nullable(),
});

export const GridMetaSchema = z.object({
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  bins: z.array(GridBinSchema).max(256),
  nodata: z.number().int(),
  projection: z.literal('equirectangular'),
});
export type GridMeta = z.infer<typeof GridMetaSchema>;

export const AssetSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  url: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  tier: z.enum(['2k', '4k', '8k', 'frame', 'grid', 'ramp', 'video']),
  role: z.string().min(1),
});

export const AssetManifestSchema = z.object({
  version: z.literal(1),
  generated: z.string().min(1),
  assets: z.array(AssetSchema),
});
export type AssetManifest = z.infer<typeof AssetManifestSchema>;
