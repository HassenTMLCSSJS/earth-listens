import { DEFAULT_ASSET_BASE } from '@/core/assets';

/** Public texture manifest. KTX2 bytes are fetched from this host, not from git. */
export const TEXTURE_MANIFEST_URL = `${DEFAULT_ASSET_BASE}/v1/textures/manifest.json`;

/** Same-origin path KTX2Loader reads for basis_transcoder.js and .wasm. */
export const BASIS_TRANSCODER_PATH = '/basis/';

export interface TextureAsset {
  url: string;
  bytes: number;
  format: string;
  role?: string;
  tier?: string;
}

export interface TextureManifest {
  assets?: TextureAsset[];
}

const TEXTURE_TIERS = ['1k', '2k', '4k', '8k'] as const;

/** Find the closest available public texture without selecting oversized tile assets. */
export function pickTextureAsset(
  manifest: TextureManifest,
  role: string,
  tier: (typeof TEXTURE_TIERS)[number],
  formats: string[],
): TextureAsset | undefined {
  const tierIndex = TEXTURE_TIERS.indexOf(tier);
  const candidates = (manifest.assets ?? []).filter(
    (asset) =>
      asset.role === role &&
      TEXTURE_TIERS.includes(asset.tier as (typeof TEXTURE_TIERS)[number]) &&
      formats.includes(asset.format) &&
      asset.url.startsWith(`${DEFAULT_ASSET_BASE}/`) &&
      Number.isFinite(asset.bytes) &&
      asset.bytes > 0,
  );

  return candidates.sort((a, b) => {
    const aIndex = TEXTURE_TIERS.indexOf(a.tier as (typeof TEXTURE_TIERS)[number]);
    const bIndex = TEXTURE_TIERS.indexOf(b.tier as (typeof TEXTURE_TIERS)[number]);
    const distance = Math.abs(aIndex - tierIndex) - Math.abs(bIndex - tierIndex);
    if (distance !== 0) return distance;
    return aIndex - bIndex;
  })[0];
}

/** Smallest KTX2 on the R2 manifest. The smoke test uses it so the download stays small. */
export function pickSmokeKtx2(manifest: TextureManifest): TextureAsset {
  const files = (manifest.assets ?? []).filter(
    (asset) =>
      asset.format === 'ktx2' &&
      asset.url.startsWith(`${DEFAULT_ASSET_BASE}/`) &&
      Number.isFinite(asset.bytes) &&
      asset.bytes > 0,
  );
  const smallest = files.reduce<TextureAsset | undefined>(
    (best, asset) => (!best || asset.bytes < best.bytes ? asset : best),
    undefined,
  );
  if (!smallest) throw new Error('manifest has no KTX2 texture');
  return smallest;
}

/** Point a three.js KTX2Loader at the copied Basis transcoder. */
export function configureKtx2Loader(loader: {
  setTranscoderPath: (path: string) => unknown;
}): void {
  loader.setTranscoderPath(BASIS_TRANSCODER_PATH);
}
