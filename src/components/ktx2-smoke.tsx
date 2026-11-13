'use client';

import { useEffect, useState } from 'react';
import type { WebGLRenderer } from 'three';
import {
  BASIS_TRANSCODER_PATH,
  TEXTURE_MANIFEST_URL,
  configureKtx2Loader,
  pickSmokeKtx2,
  type TextureManifest,
} from '@/modules/globe';

/**
 * Dev-only proof that a KTX2 file from the R2 manifest decodes with KTX2Loader.
 * The listen globe is unchanged; this route is not part of the product UI.
 */
export function Ktx2Smoke() {
  const [status, setStatus] = useState('Starting KTX2 smoke.');

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    canvas.hidden = true;
    document.body.appendChild(canvas);
    let cancelled = false;
    let dispose = () => {};

    void (async () => {
      const response = await fetch(TEXTURE_MANIFEST_URL);
      if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
      const manifest = (await response.json()) as TextureManifest;
      const asset = pickSmokeKtx2(manifest);
      const THREE = await import('three');
      const { KTX2Loader } = await import('three/examples/jsm/loaders/KTX2Loader.js');
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
      dispose = () => {
        renderer.dispose();
      };
      const withInit = renderer as WebGLRenderer & { init?: () => Promise<void> };
      if (typeof withInit.init === 'function') await withInit.init();
      const loader = new KTX2Loader();
      configureKtx2Loader(loader);
      loader.detectSupport(renderer);
      const texture = await loader.loadAsync(asset.url);
      const image = texture.image as { width?: number } | undefined;
      const width = image?.width ?? 0;
      texture.dispose();
      loader.dispose();
      if (!cancelled) {
        setStatus(`Loaded ${width}px KTX2 from ${asset.url} via ${BASIS_TRANSCODER_PATH}`);
      }
    })().catch((error: unknown) => {
      if (!cancelled) setStatus(error instanceof Error ? error.message : 'KTX2 smoke failed');
    });

    return () => {
      cancelled = true;
      dispose();
      canvas.remove();
    };
  }, []);

  return (
    <p data-testid="ktx2-smoke" role="status">
      {status}
    </p>
  );
}
