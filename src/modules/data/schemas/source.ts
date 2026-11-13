import * as z from 'zod';

export const SourceSchema = z.object({
  name: z.string(),
  dataset_url: z.string(),
  eic_page: z.string(),
  retrieved: z.string().nullable(),
  sha256: z.string().nullable(),
  citation: z.string(),
  ack: z.string().nullable(),
  svs_id: z.number().int().optional(),
  gibs_layer: z.string().optional(),
  license: z.string().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const SourceListSchema = z.union([SourceSchema, z.array(SourceSchema).min(1)]);

function isSourceList(source: Source | readonly Source[]): source is readonly Source[] {
  return Array.isArray(source);
}

export function sourcesOf(source: Source | readonly Source[]): Source[] {
  if (isSourceList(source)) return source.map((item) => item);
  return [source];
}
