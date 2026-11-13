export interface ColormapEntry {
  rgb: [number, number, number];
  ref: number;
  lo: number | null;
  hi: number | null;
  mid: number | null;
  nodata: boolean;
  estimated: boolean;
}

export interface Colormap {
  entries: ColormapEntry[];
  byRgb: Map<string, ColormapEntry>;
  units: string;
}

function attr(tag: string, name: string): string | null {
  const match = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return match?.[1] ?? null;
}

function edge(token: string): number | null {
  if (token.includes('INF')) return null;
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

export function parseColormapXml(xml: string): Colormap {
  const unitsMatch = /units="([^"]+)"/.exec(xml);
  const entries: ColormapEntry[] = [];
  for (const match of xml.matchAll(/<ColorMapEntry\b([^>]*)\/>/g)) {
    const tag = match[1] ?? '';
    const rgbText = attr(tag, 'rgb');
    if (!rgbText) continue;
    const channels = rgbText.split(',').map((part) => Number(part.trim()));
    const red = channels[0];
    const green = channels[1];
    const blue = channels[2];
    if (red === undefined || green === undefined || blue === undefined) continue;
    const source = attr(tag, 'sourceValue');
    const nodata = attr(tag, 'nodata') === 'true' || attr(tag, 'transparent') === 'true';
    let lo: number | null = null;
    let hi: number | null = null;
    let estimated = false;
    let mid: number | null = null;
    if (source) {
      const body = source.trim().replace(/^\[/, '').replace(/\)$/, '');
      const [left, right] = body.split(',');
      lo = left ? edge(left) : null;
      hi = right ? edge(right) : null;
      estimated = lo === null || hi === null;
      if (lo === null && hi === null) mid = null;
      else if (lo === null) mid = hi;
      else if (hi === null) mid = lo;
      else mid = (lo + hi) / 2;
    }
    const refText = attr(tag, 'ref');
    entries.push({
      rgb: [red, green, blue],
      ref: refText ? Number(refText) : entries.length,
      lo,
      hi,
      mid,
      nodata: nodata && !source,
      estimated,
    });
  }
  const byRgb = new Map<string, ColormapEntry>();
  for (const entry of entries) {
    if (entry.nodata || entry.mid === null) continue;
    byRgb.set(entry.rgb.join(','), entry);
  }
  return { entries, byRgb, units: unitsMatch?.[1] ?? '' };
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface DecodeResult {
  bins: Uint8Array;
  values: Float32Array;
  hitRate: number;
  opaque: number;
  estimated: number;
}

/** Exact palette match. A miss stays bin 0 / NaN and lowers the hit rate. */
export function decodeRgba(pixels: readonly Rgba[], cmap: Colormap): DecodeResult {
  const bins = new Uint8Array(pixels.length);
  const values = new Float32Array(pixels.length);
  let opaque = 0;
  let hits = 0;
  let estimated = 0;
  pixels.forEach((pixel, index) => {
    values[index] = Number.NaN;
    if (pixel.a === 0) return;
    opaque += 1;
    const entry = cmap.byRgb.get(`${pixel.r},${pixel.g},${pixel.b}`);
    if (!entry || entry.mid === null) return;
    hits += 1;
    bins[index] = entry.ref > 255 ? 255 : entry.ref;
    values[index] = entry.mid;
    if (entry.estimated) estimated += 1;
  });
  return { bins, values, hitRate: opaque === 0 ? 1 : hits / opaque, opaque, estimated };
}

export function wmsUrl(
  layer: string,
  time: string | null,
  width: number,
  height: number,
  format: 'png' | 'jpeg',
): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: layer,
    CRS: 'EPSG:4326',
    BBOX: '-90,-180,90,180',
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: `image/${format}`,
    STYLES: '',
  });
  if (time) params.set('TIME', time);
  return `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${params.toString()}`;
}

export interface SeasonWindow {
  id: string;
  season: 'MAM' | 'JJA' | 'SON' | 'DJF';
  year: number;
  start: string;
  days: string[];
}

const WINDOWS: { season: SeasonWindow['season']; month: number; day: number }[] = [
  { season: 'MAM', month: 4, day: 10 },
  { season: 'JJA', month: 7, day: 10 },
  { season: 'SON', month: 10, day: 10 },
  { season: 'DJF', month: 1, day: 10 },
];

function iso(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/** 18 mid-season 10-day windows, spring 2017 through summer 2021. No filled days. */
export function lightningSeasons(): SeasonWindow[] {
  const order: { year: number; season: SeasonWindow['season'] }[] = [];
  for (const season of ['MAM', 'JJA', 'SON'] as const) order.push({ year: 2017, season });
  for (const year of [2018, 2019, 2020]) {
    for (const season of ['DJF', 'MAM', 'JJA', 'SON'] as const) order.push({ year, season });
  }
  for (const season of ['DJF', 'MAM', 'JJA'] as const) order.push({ year: 2021, season });
  return order.map((item) => {
    const window = WINDOWS.find((entry) => entry.season === item.season);
    if (!window) throw new Error(item.season);
    const days = Array.from({ length: 10 }, (_, index) =>
      iso(item.year, window.month, window.day + index),
    );
    return {
      id: `${item.year}-${item.season}`,
      season: item.season,
      year: item.year,
      start: days[0] ?? '',
      days,
    };
  });
}
