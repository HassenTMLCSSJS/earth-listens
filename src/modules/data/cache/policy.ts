/** TTL mirrors the route revalidate windows. Values are seconds. */
export const FEED_TTL: Record<string, number> = {
  'gibs-dates': 3 * 60 * 60,
  'gibs-grid': 6 * 60 * 60,
  'firms-24h': 30 * 60,
  'firms-area': 30 * 60,
  'open-meteo': 15 * 60,
  'open-meteo-aq': 60 * 60,
  openaq: 60 * 60,
  'noaa-gml': 24 * 60 * 60,
  nsidc: 24 * 60 * 60,
  gistemp: 7 * 24 * 60 * 60,
  eonet: 60 * 60,
  power: 24 * 60 * 60,
  epic: 6 * 60 * 60,
};

export function cacheControl(feed: string): string {
  const ttl = FEED_TTL[feed] ?? 3600;
  return `public, s-maxage=${ttl}, stale-while-revalidate=86400`;
}
