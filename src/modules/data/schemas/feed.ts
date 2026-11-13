import * as z from 'zod';

export const FreshnessStatus = z.enum(['live', 'recent', 'snapshot', 'demo']);
export type FreshnessStatus = z.infer<typeof FreshnessStatus>;

export const FeedSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  license: z.string().min(1),
});

export const FeedEnvelopeSchema = z.object({
  feed: z.string().min(1),
  status: FreshnessStatus,
  dataTime: z.string().min(1),
  fetchedAt: z.string().min(1),
  source: FeedSourceSchema,
  latencyNote: z.string(),
  snapshotId: z.string().min(8),
  items: z.array(z.unknown()).optional(),
  grid: z
    .object({
      w: z.number().int().positive(),
      h: z.number().int().positive(),
      values: z.array(z.number().nullable()),
    })
    .optional(),
});
export type FeedEnvelope = z.infer<typeof FeedEnvelopeSchema>;

export const SourceCatalogEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  license: z.string().min(1),
  usedFor: z.string().min(1),
  key: z.string().min(1),
  group: z.enum(['nasa', 'other']),
  check: z.string().min(1),
});

export const SourceCatalogSchema = z.object({
  retrieved: z.string().min(1),
  note: z.string().min(1),
  sources: z.array(SourceCatalogEntrySchema).min(1),
});
export type SourceCatalog = z.infer<typeof SourceCatalogSchema>;
