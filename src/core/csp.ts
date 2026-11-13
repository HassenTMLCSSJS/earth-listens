/**
 * Content-Security-Policy.
 *
 * KTX2Loader transcodes Basis textures inside a blob worker and compiles
 * basis_transcoder.wasm there. That needs `'wasm-unsafe-eval'` on script-src
 * and `worker-src blob:`. Production does not add `'unsafe-eval'`.
 *
 * Hugging Face hosts are included only outside demo mode, because Kokoro and
 * Piper download ONNX weights from there. The public R2 host is on img-src
 * and connect-src outside demo mode so KTX2 and WebP textures can load.
 * Demo mode stays on same-origin, blob, and data URLs.
 * `unsafe-inline` is required by Next.js bootstrap scripts.
 */
import { DEFAULT_ASSET_BASE } from './assets';

const MODEL_HOSTS = [
  'https://huggingface.co',
  'https://cdn-lfs.huggingface.co',
  'https://cas-bridge.xethub.hf.co',
].join(' ');

const DATA_HOSTS = ['https://gibs.earthdata.nasa.gov', DEFAULT_ASSET_BASE].join(' ');

export function contentSecurityPolicy(allowModels: boolean): string {
  const connect = allowModels
    ? `'self' blob: data: ${MODEL_HOSTS} ${DATA_HOSTS}`
    : `'self' blob: data:`;
  const images = allowModels ? `'self' data: blob: ${DATA_HOSTS}` : `'self' data: blob:`;
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${images}`,
    `media-src ${images}`,
    "font-src 'self'",
    `connect-src ${connect}`,
    "worker-src 'self' blob:",
  ].join('; ');
}
