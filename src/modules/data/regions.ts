import type { Region } from './schemas';

/** Approximate boxes (W, S, E, N) and centres. Sample geography, not a political dataset. */
export const REGIONS: Region[] = [
  {
    id: 'global',
    bbox: [-180, -90, 180, 90],
    centre: [0, 0],
    label: { en: 'Global', ar: 'العالم' },
  },
  {
    id: 'egypt',
    bbox: [24.7, 22, 36.9, 31.7],
    centre: [26.8, 30.8],
    label: { en: 'Egypt', ar: 'مصر' },
  },
  {
    id: 'africa',
    bbox: [-18, -35, 52, 38],
    centre: [2, 17],
    label: { en: 'Africa', ar: 'أفريقيا' },
  },
  {
    id: 'arctic',
    bbox: [-180, 66.5, 180, 90],
    centre: [80, 0],
    label: { en: 'Arctic', ar: 'القطب الشمالي' },
  },
  {
    id: 'europe',
    bbox: [-25, 35, 45, 72],
    centre: [54, 15],
    label: { en: 'Europe', ar: 'أوروبا' },
  },
  { id: 'asia', bbox: [45, -10, 150, 80], centre: [35, 95], label: { en: 'Asia', ar: 'آسيا' } },
  {
    id: 'americas',
    bbox: [-170, -56, -30, 72],
    centre: [10, -80],
    label: { en: 'Americas', ar: 'الأمريكتان' },
  },
  {
    id: 'oceania',
    bbox: [110, -50, 180, 0],
    centre: [-25, 140],
    label: { en: 'Oceania', ar: 'أوقيانوسيا' },
  },
];

export function regionCentre(id: Region['id']): { lat: number; lon: number } {
  const region = REGIONS.find((item) => item.id === id) ?? REGIONS[0];
  return { lat: region?.centre[0] ?? 0, lon: region?.centre[1] ?? 0 };
}
