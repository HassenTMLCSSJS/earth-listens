/**
 * Content-Security-Policy.
 * Hugging Face hosts are included only outside demo mode, because Kokoro and
 * Piper download ONNX weights from there. Demo mode stays on same-origin,
 * blob, and data URLs. `unsafe-inline` is required by Next.js bootstrap scripts;
 * `wasm-unsafe-eval` is required by the local TTS engines.
 */
const MODEL_HOSTS = [
  'https://huggingface.co',
  'https://cdn-lfs.huggingface.co',
  'https://cas-bridge.xethub.hf.co',
].join(' ');

export function contentSecurityPolicy(allowModels: boolean): string {
  const connect = allowModels ? `'self' blob: data: ${MODEL_HOSTS}` : `'self' blob: data:`;
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connect}`,
    "worker-src 'self' blob:",
  ].join('; ');
}
