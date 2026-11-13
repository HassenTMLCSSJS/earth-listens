import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { collectNarrationLines } from '../../src/modules/narration/lines';

const root = process.cwd();

async function main(): Promise<void> {
  const explanations = JSON.parse(
    await readFile(path.join(root, 'public/data/explanations/all.json'), 'utf8'),
  ) as {
    items: { id: string; level: 'short' | 'detailed'; text: { en: string; ar: string } }[];
  };
  const regions = JSON.parse(
    await readFile(path.join(root, 'public/data/regions.json'), 'utf8'),
  ) as {
    regions: { id: string; centre: [number, number]; label: { en: string; ar: string } }[];
  };
  const lines = collectNarrationLines({
    explanations: explanations.items,
    regions: regions.regions,
  });
  const file = path.join(root, 'public/data/narration.sources.json');
  await writeFile(
    file,
    `${JSON.stringify({ version: 1, hash: 'sha256', formula: "sha256(utf8(lang + '\\n' + text))", lines }, null, 2)}\n`,
  );
  console.log(`wrote ${lines.length} lines to ${file}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
