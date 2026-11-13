export interface GistempYear {
  year: number;
  value: number | null;
}

/** Annual J-D column. `***` is missing and is never filled. */
export function parseGistemp(text: string): GistempYear[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  const header = rows.find((row) => row.startsWith('Year,'));
  if (!header) return [];
  const index = header.split(',').indexOf('J-D');
  const out: GistempYear[] = [];
  for (const row of rows) {
    const cells = row.split(',');
    const yearText = cells[0] ?? '';
    if (!/^\d{4}$/.test(yearText)) continue;
    const cell = cells[index] ?? '***';
    out.push({
      year: Number(yearText),
      value: cell === '***' || cell === '' ? null : Number(cell),
    });
  }
  return out;
}

export interface Co2Month {
  year: number;
  month: number;
  average: number | null;
}

export function parseNoaaCo2(text: string): Co2Month[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  const header = rows.find((row) => row.startsWith('year,'));
  if (!header) return [];
  const columns = header.split(',').map((name) => name.trim());
  const yearI = columns.indexOf('year');
  const monthI = columns.indexOf('month');
  const avgI = columns.indexOf('average');
  const out: Co2Month[] = [];
  for (const row of rows) {
    const cells = row.split(',');
    const yearText = (cells[yearI] ?? '').trim();
    if (!/^\d{4}$/.test(yearText)) continue;
    const average = Number((cells[avgI] ?? '').trim());
    out.push({
      year: Number(yearText),
      month: Number((cells[monthI] ?? '').trim()),
      average:
        average === -99.99 || average === -9.99 || !Number.isFinite(average) ? null : average,
    });
  }
  return out;
}

export interface IceMonth {
  year: number;
  month: number;
  extent: number | null;
}

export function parseNsidcMonthly(text: string): IceMonth[] {
  const out: IceMonth[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const cells = line.split(',').map((cell) => cell.trim());
    const yearText = cells[0] ?? '';
    if (!/^\d{4}$/.test(yearText) || yearText === 'year') continue;
    const extent = Number(cells[4] ?? '');
    out.push({
      year: Number(yearText),
      month: Number(cells[1] ?? ''),
      extent: extent === -9999 || !Number.isFinite(extent) ? null : extent,
    });
  }
  return out;
}

export interface FirePoint {
  lat: number;
  lon: number;
  date: string;
  confidence: string;
  frp: number;
}

const KEEP = new Set(['n', 'h', 'nominal', 'high']);

export function parseFirmsCsv(text: string): FirePoint[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const header = lines[0]?.split(',') ?? [];
  const col = (name: string) => header.indexOf(name);
  const latI = col('latitude');
  const lonI = col('longitude');
  const dateI = col('acq_date');
  const confI = col('confidence');
  const frpI = col('frp');
  const out: FirePoint[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    if (cells.length !== header.length) continue;
    const confidence = (cells[confI] ?? '').trim();
    if (!KEEP.has(confidence)) continue;
    out.push({
      lat: Number(cells[latI]),
      lon: Number(cells[lonI]),
      date: cells[dateI] ?? '',
      confidence,
      frp: Number(cells[frpI]),
    });
  }
  return out;
}

export interface FireCell {
  lat: number;
  lon: number;
  count: number;
  frpMean: number;
}

/** 1° bins plus the hottest points, capped so the JSON stays small. */
export function binFires(
  points: readonly FirePoint[],
  limit = 200,
): { cells: FireCell[]; top: FirePoint[] } {
  const bins = new Map<string, { lat: number; lon: number; count: number; frp: number }>();
  for (const point of points) {
    const lat = Math.floor(point.lat);
    const lon = Math.floor(point.lon);
    const key = `${lat},${lon}`;
    const bin = bins.get(key) ?? { lat, lon, count: 0, frp: 0 };
    bin.count += 1;
    bin.frp += point.frp;
    bins.set(key, bin);
  }
  const cells = [...bins.values()]
    .map((bin) => ({ lat: bin.lat, lon: bin.lon, count: bin.count, frpMean: bin.frp / bin.count }))
    .sort((a, b) => b.count - a.count || b.frpMean - a.frpMean);
  const top = points
    .slice()
    .sort((a, b) => b.frp - a.frp)
    .slice(0, limit);
  return { cells, top };
}

export interface MeteoNow {
  time: string;
  temperatureC: number | null;
  windKmh: number | null;
  precipitationMm: number | null;
}

export function parseOpenMeteo(body: unknown): MeteoNow | null {
  if (!body || typeof body !== 'object') return null;
  const current = (body as { current?: Record<string, unknown> }).current;
  if (!current || typeof current.time !== 'string') return null;
  const num = (key: string) => (typeof current[key] === 'number' ? (current[key] as number) : null);
  return {
    time: current.time,
    temperatureC: num('temperature_2m'),
    windKmh: num('wind_speed_10m'),
    precipitationMm: num('precipitation'),
  };
}

export interface AqNow {
  time: string;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  co: number | null;
  usAqi: number | null;
}

export function parseOpenMeteoAq(body: unknown): AqNow | null {
  if (!body || typeof body !== 'object') return null;
  const current = (body as { current?: Record<string, unknown> }).current;
  if (!current || typeof current.time !== 'string') return null;
  const num = (key: string) => (typeof current[key] === 'number' ? (current[key] as number) : null);
  return {
    time: current.time,
    pm25: num('pm2_5'),
    pm10: num('pm10'),
    no2: num('nitrogen_dioxide'),
    o3: num('ozone'),
    co: num('carbon_monoxide'),
    usAqi: num('us_aqi'),
  };
}

export interface EonetEvent {
  id: string;
  title: string;
  category: string;
  date: string;
  lat: number;
  lon: number;
}

export function parseEonet(body: unknown): EonetEvent[] {
  if (!body || typeof body !== 'object') return [];
  const events = (body as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];
  const out: EonetEvent[] = [];
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const row = event as {
      id?: unknown;
      title?: unknown;
      categories?: { title?: string }[];
      geometry?: { date?: string; coordinates?: number[] }[];
    };
    const geometry = row.geometry?.[0];
    const lon = geometry?.coordinates?.[0];
    const lat = geometry?.coordinates?.[1];
    if (typeof row.id !== 'string' || typeof row.title !== 'string') continue;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    out.push({
      id: row.id,
      title: row.title,
      category: row.categories?.[0]?.title ?? 'event',
      date: geometry?.date ?? '',
      lat,
      lon,
    });
  }
  return out;
}

export interface OpenAqPoint {
  parameter: string;
  value: number;
  unit: string;
  date: string;
}

export function parseOpenAq(body: unknown): OpenAqPoint[] {
  if (!body || typeof body !== 'object') return [];
  const results = (body as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const out: OpenAqPoint[] = [];
  for (const result of results) {
    if (!result || typeof result !== 'object') continue;
    const row = result as {
      parameter?: { name?: string; units?: string };
      value?: number;
      datetime?: { utc?: string };
    };
    if (typeof row.parameter?.name !== 'string' || typeof row.value !== 'number') continue;
    out.push({
      parameter: row.parameter.name,
      value: row.value,
      unit: row.parameter.units ?? '',
      date: row.datetime?.utc ?? '',
    });
  }
  return out;
}
