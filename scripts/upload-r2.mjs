#!/usr/bin/env node
/**
 * Upload release-assets to Cloudflare R2 with the S3 API.
 *
 * Dry-run unless --yes is passed. --dry-run is accepted and is the default.
 * Credentials are read from the environment and never printed.
 *
 *   node scripts/upload-r2.mjs --dir release-assets
 *   node scripts/upload-r2.mjs --dir release-assets --dry-run
 *   node scripts/upload-r2.mjs --dir release-assets --yes
 *
 * Required to upload: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_S3_ENDPOINT, R2_BUCKET.
 * Object keys are v1/<layer>/<file>. Cache-Control is immutable.
 * The public base URL is NEXT_PUBLIC_ASSET_BASE_URL (not required for the upload).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const yes = args.includes('--yes');
const dry = args.includes('--dry-run') || !yes;
const dirFlag = args.indexOf('--dir');
const dir = dirFlag >= 0 ? args[dirFlag + 1] : '';
if (!dir) {
  console.error('Pass --dir <folder of release files>.');
  process.exit(1);
}

const TYPES = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json',
  '.webm': 'video/webm',
  '.ktx2': 'image/ktx2',
  '.mp4': 'video/mp4',
  '.svg': 'image/svg+xml',
};

function walk(folder) {
  const out = [];
  for (const name of readdirSync(folder)) {
    const full = path.join(folder, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function objectKey(file) {
  const relative = path.relative(dir, file).split(path.sep).join('/');
  return `v1/${relative}`;
}

let files = [];
try {
  files = walk(dir);
} catch (error) {
  console.error(`Cannot read ${dir}.`);
  process.exit(1);
}

const base = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? '').replace(/\/$/, '');
console.log(`${files.length} files under ${dir}`);
for (const file of files) {
  const key = objectKey(file);
  const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const bytes = statSync(file).size;
  const url = base && base !== 'off' ? `${base}/${key}` : key;
  console.log(`  ${key}  ${type}  ${bytes}  ${url}`);
}
if (dry) {
  console.log('Dry run. Re-run with --yes to upload. Nothing was sent.');
  process.exit(0);
}

const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';
const endpoint = process.env.R2_S3_ENDPOINT ?? '';
const bucket = process.env.R2_BUCKET ?? '';
if (!accessKeyId || !secretAccessKey || !endpoint || !bucket) {
  console.error('Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_S3_ENDPOINT, and R2_BUCKET.');
  process.exit(1);
}

const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

let sent = 0;
for (const file of files) {
  const key = objectKey(file);
  const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: readFileSync(file),
      ContentType: type,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  sent += 1;
  console.log(`uploaded ${key}`);
}
console.log(`Uploaded ${sent} objects to ${bucket}.`);
