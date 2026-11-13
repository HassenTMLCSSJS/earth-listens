import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { REGION_IDS, SYMPHONY_LAYER_IDS, type LayerId, type RegionId } from '../src/core/actions';
import { mulberry32, nextGaussian } from '../src/core/prng';
import { REGIONS } from '../src/modules/data/regions';
import {
  LayerConfigSchema,
  LayerDataSchema,
  RegionsFileSchema,
  RegistrySchema,
} from '../src/modules/data/schemas';
import { LAYER_REGISTERS, SAMPLE_RANGES, TIMBRES } from '../src/modules/sonification/constants';

const root = process.cwd();
const rand = mulberry32(20261114);
const noise = (sigma: number) => nextGaussian(rand) * sigma;

const FIRMS_ACK =
  "We acknowledge the use of data and imagery from LANCE FIRMS operated by NASA's Earth Science Data and Information System (ESDIS) with funding provided by NASA Headquarters.";

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function point(
  t: number | string,
  v: number | null,
  q: 'ok' | 'missing' | 'estimated' = v === null ? 'missing' : 'ok',
) {
  return { t, v: v === null ? null : round4(v), q };
}

function years(from: number, to: number): number[] {
  const out: number[] = [];
  for (let year = from; year <= to; year += 1) out.push(year);
  return out;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 2025, (m ?? 1) - 1, (d ?? 1) + days));
  return date.toISOString().slice(0, 10);
}

const OFFSET: Record<RegionId, number> = {
  global: 0,
  egypt: 0.04,
  africa: 0.07,
  arctic: 0.12,
  europe: 0.03,
  asia: 0.05,
  americas: 0.02,
  oceania: -0.02,
};

function temperatureSeries() {
  const series = {} as Record<RegionId, ReturnType<typeof point>[]>;
  for (const region of REGION_IDS) {
    series[region] = years(1880, 2025).map((year) => {
      if (region === 'africa' && year <= 1900) return point(year, null, 'missing');
      if (region === 'global' && year === 2024) return point(year, 1.85, 'ok');
      const trend = -0.3 + 1.4 * ((year - 1880) / 145) ** 2.2 + 0.08 * Math.sin(year / 3.7);
      const value = Math.min(1.35, Math.max(-0.55, trend + OFFSET[region] + noise(0.05)));
      return point(year, value, 'ok');
    });
  }
  return series;
}

function co2Series() {
  const monthly: ReturnType<typeof point>[] = [];
  const annual: ReturnType<typeof point>[] = [];
  const seasonal: ReturnType<typeof point>[] = [];
  for (let year = 1958; year <= 2025; year += 1) {
    const months: number[] = [];
    for (let month = 1; month <= 12; month += 1) {
      const decimal = year + (month - 0.5) / 12;
      const value =
        312 +
        0.8 * (decimal - 1958) +
        0.0125 * (decimal - 1958) ** 2 +
        3 * Math.sin((2 * Math.PI * month) / 12);
      months.push(value);
      monthly.push(point(`${year}-${String(month).padStart(2, '0')}`, value));
    }
    const mean = months.reduce((sum, value) => sum + value, 0) / months.length;
    annual.push(point(year, mean));
    seasonal.push(point(year, Math.max(...months) - Math.min(...months)));
  }
  const series = {} as Record<RegionId, ReturnType<typeof point>[]>;
  for (const region of REGION_IDS)
    series[region] = region === 'global' ? annual : annual.map((item) => ({ ...item }));
  return { series, monthly, seasonal };
}

function seaIceSeries() {
  const global = years(1979, 2025).map((year) =>
    point(year, 7.2 - 0.075 * (year - 1979) + noise(0.25)),
  );
  const series = {} as Record<RegionId, ReturnType<typeof point>[]>;
  for (const region of REGION_IDS)
    series[region] =
      region === 'arctic' || region === 'global' ? global.map((item) => ({ ...item })) : [];
  series.global = global;
  return series;
}

function wildfire() {
  const centres = [
    [37.5, 22.5],
    [37.5, 27.5],
    [42.5, 17.5],
    [32.5, 32.5],
    [37.5, 12.5],
    [2.5, 17.5],
    [2.5, 22.5],
    [7.5, 22.5],
    [-2.5, 27.5],
    [7.5, 17.5],
    [62.5, 97.5],
    [67.5, 102.5],
    [57.5, 92.5],
    [62.5, 107.5],
    [67.5, 87.5],
    [-7.5, -62.5],
    [-2.5, -57.5],
    [-7.5, -67.5],
    [2.5, -62.5],
    [-12.5, -57.5],
  ];
  const extra = [
    [32.5, 22.5],
    [42.5, 27.5],
    [12.5, 22.5],
    [-2.5, 17.5],
    [57.5, 112.5],
    [72.5, 97.5],
    [-2.5, -72.5],
    [2.5, -52.5],
    [27.5, 32.5],
    [47.5, 22.5],
    [7.5, 32.5],
    [-7.5, 22.5],
    [62.5, 82.5],
    [52.5, 102.5],
    [-12.5, -67.5],
    [7.5, -62.5],
    [37.5, 37.5],
    [17.5, 27.5],
    [67.5, 117.5],
    [-7.5, -52.5],
  ];
  const grid = [...centres, ...extra];
  const cells = [];
  for (let day = 0; day < 60; day += 1) {
    const t = addDays('2025-07-01', day);
    for (const pair of grid) {
      const lat = pair[0] ?? 0;
      const lon = pair[1] ?? 0;
      const count = Math.round(8 + rand() * 70);
      const frp = round4(5 + rand() * 80);
      cells.push({ t, lat, lon, count, frp_mean: frp });
    }
  }
  const annual = years(2012, 2025).map((year) => point(year, 15 + rand() * 60));
  return { cells, annual };
}

function configFor(
  id: (typeof SYMPHONY_LAYER_IDS)[number],
  timeKind: 'year' | 'day',
  category: 'climate' | 'fire' | 'ice_ocean',
  where: string,
  strong: string,
  fast: string,
  fastRange: [number, number],
  page: string,
  role: string,
  from: number,
  to: number,
  scale: 'pentatonic_major' | 'major',
) {
  const range = SAMPLE_RANGES[id];
  const registers = LAYER_REGISTERS[id];
  return LayerConfigSchema.parse({
    id,
    category,
    title: {
      temperature: { en: 'Temperature', ar: 'الحرارة' },
      wildfire: { en: 'Wildfire', ar: 'الحرايق' },
      sea_ice: { en: 'Sea ice', ar: 'الجليد' },
      co2: { en: 'Carbon dioxide', ar: 'ثاني أكسيد الكربون' },
    }[id],
    unit: { en: range.unit, ar: range.unit },
    timeKind,
    eic: { page, frames: `/frames/${id}` },
    variables: {
      how_much: { field: id === 'wildfire' ? 'count' : 'v', range: [range.min, range.max] },
      how_strong: { field: strong, range: strong.startsWith('const:') ? [0, 1] : [0, 100] },
      how_fast: { field: fast, range: fastRange },
      where: { field: where },
      ...(id === 'co2' ? { seasonalAmplitude: { field: 'v', range: [0, 12] } } : {}),
    },
    what: { timbre: TIMBRES[id], register: registers.solo, symphonyRegister: registers.symphony },
    scale,
    regions: [...REGION_IDS],
    symphony: { role, from, to },
  });
}

function source(name: string, url: string, page: string, citation: string, ack: string | null) {
  return {
    name: `SAMPLE — ${name}`,
    dataset_url: url,
    eic_page: page,
    retrieved: null,
    sha256: null,
    citation: `SAMPLE synthetic series. Real source to plug in: ${citation}`,
    ack,
  };
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function color(t: number): [number, number, number] {
  const n = Math.min(1, Math.max(0, t));
  return [
    Math.round(40 + 200 * n),
    Math.round(80 + 40 * (1 - Math.abs(n - 0.5) * 2)),
    Math.round(180 - 150 * n),
  ];
}

async function frame(file: string, mix: number, label: string): Promise<void> {
  const width = 2048;
  const height = 1024;
  const [r, g, b] = color(mix);
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgb(${r},${g},${b})"/>
      <stop offset="100%" stop-color="rgb(${Math.max(0, r - 50)},${Math.max(0, g - 20)},${Math.min(255, b + 30)})"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="48%" text-anchor="middle" font-size="160" fill="white" font-family="sans-serif">SAMPLE</text>
    <text x="50%" y="62%" text-anchor="middle" font-size="48" fill="white" font-family="sans-serif">${label}</text>
  </svg>`;
  let quality = 50;
  let body = await sharp(Buffer.from(svg)).webp({ quality }).toBuffer();
  while (body.length > 200_000 && quality > 15) {
    quality -= 10;
    body = await sharp(Buffer.from(svg)).webp({ quality }).toBuffer();
  }
  if (body.length > 200_000) throw new Error(`${file} is ${body.length} bytes`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

async function earthTexture(): Promise<void> {
  const note = path.join(root, 'public/textures/SOURCE.txt');
  try {
    const current = await readFile(note, 'utf8');
    if (current.includes('NASA GIBS')) return;
  } catch {
    /* No note yet: the base generator may still try a public-domain download. */
  }
  const dest = path.join(root, 'public/textures/earth-day.jpg');
  await mkdir(path.dirname(dest), { recursive: true });
  const urls = [
    'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg',
    'https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x5400x2700.jpg',
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      await sharp(bytes).resize(2048, 1024, { fit: 'fill' }).jpeg({ quality: 70 }).toFile(dest);
      await writeFile(
        path.join(root, 'public/textures/SOURCE.txt'),
        `Downloaded SAMPLE-sized derivative of ${url}\nNot a claim of NASA endorsement.\n`,
      );
      return;
    } catch {
      /* Try the next public-domain URL, then a labelled stand-in. */
    }
  }
  const svg = `<svg width="2048" height="1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#12365e"/>
    <ellipse cx="30%" cy="45%" rx="18%" ry="22%" fill="#3d6b45"/>
    <ellipse cx="62%" cy="48%" rx="22%" ry="18%" fill="#4e7c4a"/>
    <text x="50%" y="50%" text-anchor="middle" font-size="64" fill="white" font-family="sans-serif">SAMPLE TEXTURE — not Blue Marble</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 70 }).toFile(dest);
  await writeFile(
    path.join(root, 'public/textures/SOURCE.txt'),
    'Procedural stand-in. NASA Blue Marble URLs were not reachable from this build. Do not describe this file as a NASA image.\n',
  );
}

async function main(): Promise<void> {
  const temperature = temperatureSeries();
  const co2 = co2Series();
  const ice = seaIceSeries();
  const fires = wildfire();

  const configs = {
    temperature: configFor(
      'temperature',
      'year',
      'climate',
      'region_center',
      'const:0.5',
      'delta(v)',
      [0, 0.4],
      'https://earth.gov/sealevel/vital-signs/global-temperature/',
      'melody',
      1880,
      2025,
      'pentatonic_major',
    ),
    wildfire: configFor(
      'wildfire',
      'day',
      'fire',
      'cell',
      'frp_mean',
      'delta(count)',
      [0, 40],
      'https://earth.gov/themes/wildfires',
      'sparks',
      2012,
      2025,
      'pentatonic_major',
    ),
    sea_ice: configFor(
      'sea_ice',
      'year',
      'ice_ocean',
      'fixed:80,0',
      'const:0.5',
      'delta(v)',
      [0, 1],
      'https://nsidc.org/data/g02135/versions/4',
      'bells',
      1979,
      2025,
      'major',
    ),
    co2: configFor(
      'co2',
      'year',
      'climate',
      'global',
      'const:0.5',
      'delta(v)',
      [0, 4],
      'https://earth.gov/sealevel/vital-signs/carbon-dioxide/',
      'drone',
      1958,
      2025,
      'pentatonic_major',
    ),
  };

  const layers = {
    temperature: LayerDataSchema.parse({
      id: 'temperature',
      sample: true,
      title: configs.temperature.title,
      unit: configs.temperature.unit,
      source: source(
        'shaped like GISTEMP v4',
        'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv',
        configs.temperature.eic.page,
        'GISTEMP Team, NASA Goddard Institute for Space Studies.',
        null,
      ),
      range: { min: 1880, max: 2025 },
      series: temperature,
      annual: null,
      cells: null,
      seasonalAmplitude: null,
      frames: [],
      events: [
        { t: 2024, label: { en: 'SAMPLE out-of-range year', ar: 'سنة تجريبية خارج المدى' } },
      ],
      description: {
        en: 'SAMPLE temperature anomaly. Not a NASA measurement.',
        ar: 'عينة تجريبية لشذوذ الحرارة. ليست قياسًا من ناسا.',
      },
    }),
    co2: LayerDataSchema.parse({
      id: 'co2',
      sample: true,
      title: configs.co2.title,
      unit: configs.co2.unit,
      source: source(
        'shaped like NOAA GML Mauna Loa',
        'https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv',
        configs.co2.eic.page,
        'Lan, Tans and Thoning, NOAA Global Monitoring Laboratory.',
        null,
      ),
      range: { min: 1958, max: 2025 },
      series: co2.series,
      annual: co2.series.global,
      cells: null,
      seasonalAmplitude: co2.seasonal,
      frames: [],
      events: [{ t: 1958, label: { en: 'SAMPLE series start', ar: 'بداية السلسلة التجريبية' } }],
      description: {
        en: 'SAMPLE carbon dioxide curve. Not an NOAA measurement.',
        ar: 'منحنى تجريبي لثاني أكسيد الكربون. ليس قياس NOAA.',
      },
    }),
    sea_ice: LayerDataSchema.parse({
      id: 'sea_ice',
      sample: true,
      title: configs.sea_ice.title,
      unit: configs.sea_ice.unit,
      source: source(
        'shaped like NSIDC Sea Ice Index',
        'https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_09_extent_v4.0.csv',
        'https://earth.gov/sealevel/vital-signs/global-temperature/',
        'NSIDC Sea Ice Index. Verify the DOI before citing it.',
        null,
      ),
      range: { min: 1979, max: 2025 },
      series: ice,
      annual: ice.global,
      cells: null,
      seasonalAmplitude: null,
      frames: [],
      events: [{ t: 1979, label: { en: 'SAMPLE September series', ar: 'سلسلة سبتمبر التجريبية' } }],
      description: {
        en: 'SAMPLE September sea ice. Not an NSIDC measurement.',
        ar: 'جليد سبتمبر تجريبي. ليس قياس NSIDC.',
      },
    }),
    wildfire: LayerDataSchema.parse({
      id: 'wildfire',
      sample: true,
      title: configs.wildfire.title,
      unit: configs.wildfire.unit,
      source: source(
        'shaped like FIRMS VIIRS',
        'https://firms.modaps.eosdis.nasa.gov/api/area/csv/',
        configs.wildfire.eic.page,
        'NASA FIRMS.',
        FIRMS_ACK,
      ),
      range: { min: 2012, max: 2025 },
      series: Object.fromEntries(
        REGION_IDS.map((id) => [id, fires.annual.map((item) => ({ ...item }))]),
      ),
      annual: fires.annual,
      cells: fires.cells,
      seasonalAmplitude: null,
      frames: [],
      events: [{ t: '2025-08-04', label: { en: 'SAMPLE fire day', ar: 'يوم حريق تجريبي' } }],
      description: {
        en: 'SAMPLE fire counts. Not a FIRMS measurement.',
        ar: 'أعداد حرائق تجريبية. ليست قياسات FIRMS.',
      },
    }),
  };

  const frameIndex: Record<
    (typeof SYMPHONY_LAYER_IDS)[number],
    { t: number | string; src: string }[]
  > = {
    temperature: [],
    wildfire: [],
    sea_ice: [],
    co2: [],
  };

  for (const year of years(1880, 2025)) {
    if ((year - 1880) % 5 !== 0 && year !== 2025) continue;
    const src = `/frames/temperature/${year}.webp`;
    await frame(path.join(root, 'public', src), (year - 1880) / 145, `SAMPLE ${year}`);
    frameIndex.temperature.push({ t: year, src });
  }
  for (const year of years(1958, 2025)) {
    if ((year - 1958) % 5 !== 0 && year !== 2025) continue;
    const src = `/frames/co2/${year}.webp`;
    await frame(path.join(root, 'public', src), (year - 1958) / 67, `SAMPLE ${year}`);
    frameIndex.co2.push({ t: year, src });
  }
  for (const year of years(1979, 2025)) {
    if ((year - 1979) % 5 !== 0 && year !== 2025) continue;
    const src = `/frames/sea_ice/${year}.webp`;
    await frame(path.join(root, 'public', src), 1 - (year - 1979) / 46, `SAMPLE ${year}`);
    frameIndex.sea_ice.push({ t: year, src });
  }
  for (let day = 0; day < 60; day += 5) {
    const iso = addDays('2025-07-01', day);
    const src = `/frames/wildfire/${iso}.webp`;
    await frame(path.join(root, 'public', src), day / 60, `SAMPLE ${iso}`);
    frameIndex.wildfire.push({ t: iso, src });
  }

  for (const id of SYMPHONY_LAYER_IDS) {
    const data = { ...layers[id], frames: frameIndex[id] };
    LayerDataSchema.parse(data);
    await writeJson(path.join(root, `public/data/layers/${id}.config.json`), configs[id]);
    await writeJson(path.join(root, `public/data/layers/${id}.sample.json`), data);
  }

  const regions = RegionsFileSchema.parse({
    regions: REGIONS.map((region) => ({
      id: region.id,
      bbox: region.bbox,
      centre: region.centre,
      label: region.label,
    })),
  });
  await writeJson(path.join(root, 'public/data/regions.json'), regions);
  const registryPath = path.join(root, 'public/data/registry.json');
  let kept: { id: LayerId; config: string; data: string }[] = [];
  try {
    const current = RegistrySchema.parse(JSON.parse(await readFile(registryPath, 'utf8')));
    kept = current.layers.filter(
      (layer) => !SYMPHONY_LAYER_IDS.includes(layer.id as (typeof SYMPHONY_LAYER_IDS)[number]),
    );
  } catch {
    kept = [];
  }
  await writeJson(
    registryPath,
    RegistrySchema.parse({
      version: 1,
      layers: [
        ...SYMPHONY_LAYER_IDS.map((id) => ({
          id,
          config: `/data/layers/${id}.config.json`,
          data: `/data/layers/${id}.sample.json`,
        })),
        ...kept,
      ],
    }),
  );
  await earthTexture();
  console.log('SAMPLE files written');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
