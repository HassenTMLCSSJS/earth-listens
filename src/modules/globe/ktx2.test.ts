import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSET_BASE } from '@/core/assets';
import {
  BASIS_TRANSCODER_PATH,
  configureKtx2Loader,
  pickSmokeKtx2,
  type TextureAsset,
} from '@/modules/globe';

const require = createRequire(import.meta.url);

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

describe('basis transcoder copies', () => {
  it('matches the three.js files served from /basis/', () => {
    const threeRoot = path.resolve(path.dirname(require.resolve('three')), '..');
    const source = path.join(threeRoot, 'examples/jsm/libs/basis');
    const copied = path.resolve('public/basis');
    for (const name of ['basis_transcoder.js', 'basis_transcoder.wasm']) {
      expect(sha256(path.join(copied, name))).toBe(sha256(path.join(source, name)));
    }
    const wasm = readFileSync(path.join(copied, 'basis_transcoder.wasm'));
    expect(wasm.subarray(0, 4).toString('utf8')).toBe('\0asm');
  });
});

describe('KTX2 manifest selection', () => {
  const small: TextureAsset = {
    url: `${DEFAULT_ASSET_BASE}/v1/textures/earth-clouds/1k.ktx2`,
    bytes: 100,
    format: 'ktx2',
  };
  const large: TextureAsset = {
    url: `${DEFAULT_ASSET_BASE}/v1/textures/earth-day/4k.ktx2`,
    bytes: 9000,
    format: 'ktx2',
  };

  it('picks the smallest KTX2 on the asset host', () => {
    expect(
      pickSmokeKtx2({
        assets: [
          large,
          { url: `${DEFAULT_ASSET_BASE}/v1/textures/earth-day/2k.webp`, bytes: 10, format: 'webp' },
          { url: 'https://example.test/other.ktx2', bytes: 1, format: 'ktx2' },
          small,
        ],
      }),
    ).toEqual(small);
  });

  it('refuses a manifest with no KTX2 texture', () => {
    expect(() => pickSmokeKtx2({ assets: [] })).toThrow(/no KTX2/);
  });

  it('points the loader at /basis/', () => {
    const paths: string[] = [];
    configureKtx2Loader({
      setTranscoderPath(next) {
        paths.push(next);
        return undefined;
      },
    });
    expect(paths).toEqual([BASIS_TRANSCODER_PATH]);
    expect(BASIS_TRANSCODER_PATH.endsWith('/')).toBe(true);
  });
});
