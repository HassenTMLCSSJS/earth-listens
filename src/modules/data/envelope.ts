import type { FeedEnvelope } from './schemas';
import { FeedEnvelopeSchema } from './schemas';

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
}

export async function snapshotIdOf(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(stableStringify(value)),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export async function envelope(
  input: Omit<FeedEnvelope, 'snapshotId'> & { snapshotId?: string },
): Promise<FeedEnvelope> {
  const { snapshotId: given, ...rest } = input;
  const snapshotId = given ?? (await snapshotIdOf(rest));
  return FeedEnvelopeSchema.parse({ ...rest, snapshotId });
}

export function redactSecrets(message: string, secrets: readonly string[]): string {
  let out = message;
  for (const secret of secrets) {
    if (secret.length < 4) continue;
    out = out.split(secret).join('[redacted]');
  }
  return out;
}

const RAW_SCIENCE = /\.(?:nc4?|h5|hdf5?|he5|tiff?|mov)(?:$|[?#])/i;

export function clientUrlAllowed(url: string): boolean {
  return !RAW_SCIENCE.test(url);
}
