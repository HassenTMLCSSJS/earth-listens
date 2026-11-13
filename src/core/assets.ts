/** Public R2 bucket. Override with NEXT_PUBLIC_ASSET_BASE_URL, or set it to `off`. */
export const DEFAULT_ASSET_BASE = 'https://pub-f4844155e9804bb5adcb0c121896e82b.r2.dev';

export function assetBase(): string {
  const env = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (env === 'off') return '';
  if (!env) return DEFAULT_ASSET_BASE;
  return env.replace(/\/$/, '');
}

export function assetUrl(path: string): string {
  const base = assetBase();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
