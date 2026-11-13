import { createServer, type Server } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSET_BASE } from '@/core/assets';
import { pickSmokeKtx2, TEXTURE_MANIFEST_URL, type TextureManifest } from '@/modules/globe';

const roots: Record<string, string> = {
  '/basis/': path.resolve('public/basis'),
  '/vendor/three/': path.resolve('node_modules/three'),
};

function contentType(file: string): string {
  if (file.endsWith('.wasm')) return 'application/wasm';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  return 'application/octet-stream';
}

function resolveFile(urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const mount = Object.keys(roots).find((prefix) => decoded.startsWith(prefix));
  if (!mount) return null;
  const root = roots[mount];
  if (!root) return null;
  const full = path.normalize(path.join(root, decoded.slice(mount.length)));
  if (!full.startsWith(root)) return null;
  return full;
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') resolve(address.port);
      else reject(new Error('no port'));
    });
  });
}

const PAGE = `<!doctype html>
<meta charset="utf-8" />
<body data-status="loading"></body>
<script type="importmap">
{ "imports": { "three": "/vendor/three/build/three.module.js" } }
</script>
<script type="module">
  const url = new URL(location.href).searchParams.get('ktx2');
  const status = document.body;
  try {
    const { WebGLRenderer } = await import('three');
    const { KTX2Loader } = await import('/vendor/three/examples/jsm/loaders/KTX2Loader.js');
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    document.body.appendChild(canvas);
    const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true });
    if (typeof renderer.init === 'function') await renderer.init();
    const loader = new KTX2Loader();
    loader.setTranscoderPath('/basis/');
    loader.detectSupport(renderer);
    const texture = await loader.loadAsync(url);
    const width = texture.image && texture.image.width ? texture.image.width : 0;
    status.dataset.status = 'ok';
    status.dataset.width = String(width);
    status.textContent = 'ok ' + width;
    texture.dispose();
    loader.dispose();
    renderer.dispose();
  } catch (error) {
    status.dataset.status = 'error';
    status.textContent = error instanceof Error ? error.message : String(error);
  }
</script>
`;

describe('KTX2Loader smoke', () => {
  it('decodes a KTX2 file published on the R2 manifest', async () => {
    const response = await fetch(TEXTURE_MANIFEST_URL);
    expect(response.ok).toBe(true);
    const manifest = (await response.json()) as TextureManifest;
    const asset = pickSmokeKtx2(manifest);
    expect(asset.url.startsWith(`${DEFAULT_ASSET_BASE}/`)).toBe(true);
    expect(asset.url.endsWith('.ktx2')).toBe(true);

    const server = createServer((req, res) => {
      const url = req.url ?? '/';
      if (url.startsWith('/smoke.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(PAGE);
        return;
      }
      const file = resolveFile(url);
      if (!file) {
        res.writeHead(404);
        res.end('missing');
        return;
      }
      void stat(file)
        .then((info) => {
          if (!info.isFile()) {
            res.writeHead(404);
            res.end('missing');
            return;
          }
          res.writeHead(200, { 'content-type': contentType(file) });
          createReadStream(file).pipe(res);
        })
        .catch(() => {
          res.writeHead(404);
          res.end('missing');
        });
    });
    const port = await listen(server);
    const browser = await chromium.launch({
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${port}/smoke.html?ktx2=${encodeURIComponent(asset.url)}`);
      await page.waitForFunction(
        () => document.body.dataset.status === 'ok' || document.body.dataset.status === 'error',
        undefined,
        { timeout: 60_000 },
      );
      const status = await page.locator('body').getAttribute('data-status');
      const text = await page.locator('body').innerText();
      expect(errors, text).toEqual([]);
      expect(status, text).toBe('ok');
      const width = Number(await page.locator('body').getAttribute('data-width'));
      expect(width).toBeGreaterThan(0);
    } finally {
      await browser.close();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  }, 90_000);
});
