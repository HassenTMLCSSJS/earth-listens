/**
 * Copy three.js Basis/KTX2 transcoder files into public/basis/.
 *
 * KTX2Loader fetches /basis/basis_transcoder.js and basis_transcoder.wasm.
 * The files are also committed so a Vercel deploy still serves them if a
 * lifecycle script is skipped. postinstall and prebuild refresh the copies
 * from the installed three@0.187 so they cannot drift.
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const threeEntry = require.resolve('three');
const threeRoot = path.resolve(path.dirname(threeEntry), '..');
const source = path.join(threeRoot, 'examples/jsm/libs/basis');
const destination = path.resolve('public/basis');
const files = ['basis_transcoder.js', 'basis_transcoder.wasm'];

await mkdir(destination, { recursive: true });
for (const name of files) {
  await copyFile(path.join(source, name), path.join(destination, name));
}
console.log(`copied ${files.join(', ')} → public/basis/`);
