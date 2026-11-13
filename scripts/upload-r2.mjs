#!/usr/bin/env node
/**
 * Mirror a local directory or a downloaded GitHub release to Cloudflare R2.
 *
 * Dry-run unless you pass --yes. This script does not create the release.
 *
 *   node scripts/upload-r2.mjs --dir release-assets
 *   node scripts/upload-r2.mjs --dir release-assets --yes
 *
 * Required env (never commit the values):
 *   R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const dirFlag = args.indexOf('--dir');
const dir = dirFlag >= 0 ? args[dirFlag + 1] : '';
if (!dir) {
  console.error('Pass --dir <folder of release files>.');
  process.exit(1);
}
const account = process.env.R2_ACCOUNT_ID ?? '';
const key = process.env.R2_ACCESS_KEY_ID ?? '';
const secret = process.env.R2_SECRET_ACCESS_KEY ?? '';
const bucket = process.env.R2_BUCKET ?? '';
if (!account || !key || !secret || !bucket) {
  console.error('Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.');
  process.exit(1);
}

function walk(folder) {
  const out = [];
  for (const name of readdirSync(folder)) {
    const full = path.join(folder, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(dir);
console.log(`${files.length} files under ${dir}`);
for (const file of files) console.log(`  ${path.relative(dir, file)}`);
if (!yes) {
  console.log('Dry run. Re-run with --yes to upload. Nothing was sent.');
  process.exit(0);
}
const endpoint = `https://${account}.r2.cloudflarestorage.com`;
const result = spawnSync(
  'aws',
  [
    's3',
    'sync',
    dir,
    `s3://${bucket}/`,
    '--endpoint-url',
    endpoint,
    '--cache-control',
    'public, max-age=31536000, immutable',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      AWS_ACCESS_KEY_ID: key,
      AWS_SECRET_ACCESS_KEY: secret,
      AWS_DEFAULT_REGION: 'auto',
    },
  },
);
process.exit(result.status ?? 1);
