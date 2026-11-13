import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { liveFeed } from '../src/server/feeds/run';

const FEEDS = [
  'gistemp',
  'noaa-gml',
  'nsidc',
  'open-meteo',
  'open-meteo-aq',
  'eonet',
  'firms-24h',
  'gibs-grid',
];

async function main(): Promise<void> {
  for (const feed of FEEDS) {
    const body = await liveFeed(feed);
    const dir = path.join(process.cwd(), 'public/data/snapshots', feed);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'latest.json'), `${JSON.stringify(body, null, 2)}\n`);
    console.log(`${feed} ${body.status} ${body.snapshotId}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'snapshot failed');
  process.exit(1);
});
