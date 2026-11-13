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
