import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  binFires,
  envelope,
  parseEonet,
  parseFirmsCsv,
  parseGistemp,
  parseNoaaCo2,
  parseNsidcMonthly,
  parseOpenAq,
  parseOpenMeteo,
  parseOpenMeteoAq,
  redactSecrets,
  type FeedEnvelope,
} from '@/modules/data';
import { readServerEnv } from '@/core/env';

const GISTEMP = 'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv';
const CO2 = 'https://gml.noaa.gov/aftp/products/trends/co2/co2_mm_mlo.csv';
const NSIDC = 'https://noaadata.apps.nsidc.org/NOAA/G02135/north/monthly/data/N_09_extent_v4.0.csv';
const FIRMS =
  'https://firms.modaps.eosdis.nasa.gov/data/active_fire/noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv';
const METEO =
  'https://api.open-meteo.com/v1/forecast?latitude=30.04&longitude=31.24&current=temperature_2m,wind_speed_10m,precipitation';
const AQ =
  'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=30.04&longitude=31.24&current=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,us_aqi';
const EONET = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=7';

/** Every feed `/api/live/[feed]` and `/api/health` may serve. */
export const FEED_IDS = [
  'gistemp',
  'noaa-gml',
  'nsidc',
  'open-meteo',
  'open-meteo-aq',
  'eonet',
  'firms-24h',
  'firms-area',
  'openaq',
] as const;

export type FeedId = (typeof FEED_IDS)[number];

export function isFeedId(value: string): value is FeedId {
  return (FEED_IDS as readonly string[]).includes(value);
}

async function upstream(url: string, headers?: HeadersInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const init: RequestInit = { signal: ctrl.signal };
    if (headers) init.headers = headers;
    return await fetch(url, init);
  } finally {
    clearTimeout(timer);
  }
}

export async function readBundledSnapshot(feed: string): Promise<FeedEnvelope | null> {
  try {
    const text = await readFile(
      path.join(process.cwd(), 'public/data/snapshots', feed, 'latest.json'),
      'utf8',
    );
    return JSON.parse(text) as FeedEnvelope;
  } catch {
    return null;
  }
}

function secretList(): string[] {
  const env = readServerEnv();
  return [env.FIRMS_MAP_KEY, env.OPENAQ_API_KEY, env.NASA_API_KEY, env.EARTHDATA_TOKEN].filter(
    (value) => value.length > 0,
  );
}

/** Bundled snapshot → demo. Never a 500 when an upstream is down. */
export async function snapshotOrDemo(feed: string, note: string): Promise<FeedEnvelope> {
  const bundled = await readBundledSnapshot(feed);
  if (bundled) {
    return {
      ...bundled,
      status: bundled.status === 'live' ? 'snapshot' : bundled.status,
      latencyNote: note || bundled.latencyNote,
    };
  }
  const fetchedAt = new Date().toISOString();
  return envelope({
    feed,
    status: 'demo',
    dataTime: fetchedAt,
    fetchedAt,
    source: { name: feed, url: 'https://earth.gov/', license: 'demo' },
    latencyNote: note || 'No bundled snapshot.',
    items: [],
  });
}

export async function liveFeed(feed: string): Promise<FeedEnvelope> {
  const fetchedAt = new Date().toISOString();
  const secrets = secretList();
  try {
    const built = await buildLive(feed, fetchedAt);
    if (built) return built;
  } catch (error) {
    const message = redactSecrets(
      error instanceof Error ? error.message : 'upstream failed',
      secrets,
    );
    return snapshotOrDemo(feed, message);
  }
  const bundled = await readBundledSnapshot(feed);
  if (bundled)
    return { ...bundled, status: bundled.status === 'live' ? 'snapshot' : bundled.status };
  return snapshotOrDemo(feed, 'This feed has no live adapter in this build.');
}

async function buildLive(feed: string, fetchedAt: string): Promise<FeedEnvelope | null> {
  const env = readServerEnv();
  if (feed === 'gistemp') {
    const response = await upstream(GISTEMP);
    if (!response.ok) throw new Error(`gistemp ${response.status}`);
    const rows = parseGistemp(await response.text()).filter((row) => row.value !== null);
    const latest = rows.at(-1);
    return envelope({
      feed,
      status: 'live',
      dataTime: latest ? `${latest.year}-01-01T00:00:00Z` : fetchedAt,
      fetchedAt,
      source: { name: 'NASA GISTEMP v4', url: GISTEMP, license: 'NASA; credit GISTEMP Team' },
      latencyNote: 'Annual J-D. Missing months stay missing.',
      items: latest ? [{ year: latest.year, value: latest.value }] : [],
    });
  }
  if (feed === 'noaa-gml') {
    const response = await upstream(CO2);
    if (!response.ok) throw new Error(`co2 ${response.status}`);
    const rows = parseNoaaCo2(await response.text()).filter((row) => row.average !== null);
    const latest = rows.at(-1);
    return envelope({
      feed,
      status: 'live',
      dataTime: latest
        ? `${latest.year}-${String(latest.month).padStart(2, '0')}-01T00:00:00Z`
        : fetchedAt,
      fetchedAt,
      source: {
        name: 'NOAA GML Mauna Loa CO2',
        url: CO2,
        license: 'NOAA GML (Lan, Tans, Thoning)',
      },
      latencyNote: 'Monthly mean. Preliminary recent months can be revised by NOAA.',
      items: latest ? [{ year: latest.year, month: latest.month, ppm: latest.average }] : [],
    });
  }
  if (feed === 'nsidc') {
    const response = await upstream(NSIDC);
    if (!response.ok) throw new Error(`nsidc ${response.status}`);
    const rows = parseNsidcMonthly(await response.text()).filter((row) => row.extent !== null);
    const latest = rows.at(-1);
    return envelope({
      feed,
      status: 'live',
      dataTime: latest ? `${latest.year}-09-15T00:00:00Z` : fetchedAt,
      fetchedAt,
      source: { name: 'NSIDC Sea Ice Index v4', url: NSIDC, license: 'Fetterer et al., NSIDC' },
      latencyNote: 'September extent, million km².',
      items: latest ? [{ year: latest.year, extent: latest.extent }] : [],
    });
  }
  if (feed === 'open-meteo') {
    const response = await upstream(METEO);
    if (!response.ok) throw new Error(`open-meteo ${response.status}`);
    const parsed = parseOpenMeteo(await response.json());
    if (!parsed) throw new Error('open-meteo malformed');
    return envelope({
      feed,
      status: 'live',
      dataTime: `${parsed.time}:00Z`,
      fetchedAt,
      source: {
        name: 'Open-Meteo',
        url: 'https://api.open-meteo.com/v1/forecast',
        license: 'CC BY 4.0',
      },
      latencyNote: 'Weather data by Open-Meteo.com. Cairo centre.',
      items: [parsed],
    });
  }
  if (feed === 'open-meteo-aq') {
    const response = await upstream(AQ);
    if (!response.ok) throw new Error(`open-meteo-aq ${response.status}`);
    const parsed = parseOpenMeteoAq(await response.json());
    if (!parsed) throw new Error('open-meteo-aq malformed');
    return envelope({
      feed,
      status: 'live',
      dataTime: `${parsed.time}:00Z`,
      fetchedAt,
      source: {
        name: 'Open-Meteo Air Quality',
        url: 'https://air-quality-api.open-meteo.com/v1/air-quality',
        license: 'CC BY 4.0; modified Copernicus Atmosphere Monitoring Service information',
      },
      latencyNote: 'CAMS model for Cairo, not a station measurement.',
      items: [parsed],
    });
  }
  if (feed === 'eonet') {
    const response = await upstream(EONET);
    if (!response.ok) throw new Error(`eonet ${response.status}`);
    const events = parseEonet(await response.json());
    return envelope({
      feed,
      status: 'live',
      dataTime: events[0]?.date || fetchedAt,
      fetchedAt,
      source: { name: 'NASA EONET v3', url: EONET, license: 'NASA; credit EONET' },
      latencyNote: 'Open events from the last 7 days.',
      items: events.slice(0, 40),
    });
  }
  if (feed === 'firms-24h') {
    const response = await upstream(FIRMS);
    if (!response.ok) throw new Error(`firms ${response.status}`);
    const points = parseFirmsCsv(await response.text());
    const binned = binFires(points);
    return envelope({
      feed,
      status: 'live',
      dataTime: points[0]?.date ? `${points[0].date}T00:00:00Z` : fetchedAt,
      fetchedAt,
      source: { name: 'NASA FIRMS VIIRS NOAA-20 24h', url: FIRMS, license: 'LANCE FIRMS / ESDIS' },
      latencyNote: 'NOAA-20 VIIRS 24 h CSV, binned to 1° cells. Not the S-NPP file.',
      items: binned.top.slice(0, 200).map((point) => ({ ...point })),
    });
  }
  if (feed === 'firms-area') {
    if (!env.FIRMS_MAP_KEY) {
      return envelope({
        feed,
        status: 'demo',
        dataTime: fetchedAt,
        fetchedAt,
        source: {
          name: 'NASA FIRMS Area API',
          url: 'https://firms.modaps.eosdis.nasa.gov/api/area/',
          license: 'LANCE FIRMS / ESDIS',
        },
        latencyNote: 'FIRMS_MAP_KEY is not set. Global 24 h fires still work without it.',
        items: [],
      });
    }
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${env.FIRMS_MAP_KEY}/VIIRS_NOAA20_NRT/24.7,22,36.9,31.7/1`;
    const response = await upstream(url);
    if (!response.ok) throw new Error(`firms area ${response.status}`);
    const points = parseFirmsCsv(await response.text());
    return envelope({
      feed,
      status: 'live',
      dataTime: fetchedAt,
      fetchedAt,
      source: {
        name: 'NASA FIRMS Area API',
        url: 'https://firms.modaps.eosdis.nasa.gov/api/area/',
        license: 'LANCE FIRMS / ESDIS',
      },
      latencyNote: 'Egypt bounding box, 1 day. The key stays on the server.',
      items: points.slice(0, 200),
    });
  }
  if (feed === 'openaq') {
    if (!env.OPENAQ_API_KEY) {
      return envelope({
        feed,
        status: 'demo',
        dataTime: fetchedAt,
        fetchedAt,
        source: {
          name: 'OpenAQ',
          url: 'https://api.openaq.org/v3/',
          license: 'OpenAQ terms; cite each provider',
        },
        latencyNote:
          'OPENAQ_API_KEY is not set. Cairo model air quality still comes from Open-Meteo.',
        items: [],
      });
    }
    const response = await upstream(
      'https://api.openaq.org/v3/locations?coordinates=30.04,31.24&radius=25000',
      {
        'X-API-Key': env.OPENAQ_API_KEY,
      },
    );
    if (!response.ok) throw new Error(`openaq ${response.status}`);
    const points = parseOpenAq(await response.json());
    return envelope({
      feed,
      status: 'live',
      dataTime: fetchedAt,
      fetchedAt,
      source: {
        name: 'OpenAQ',
        url: 'https://api.openaq.org/v3/',
        license: 'OpenAQ terms; cite each provider',
      },
      latencyNote: 'Station measurements near Cairo, if any are active.',
      items: points,
    });
  }
  return null;
}
