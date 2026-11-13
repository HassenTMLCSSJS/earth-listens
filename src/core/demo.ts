export function isDemoFlag(value: string | null | undefined): boolean {
  return value === '1' || value === 'true';
}

export const DEMO_BADGE = 'DEMO';

export const SAMPLE_BANNER =
  'SAMPLE DATA: not real measurements / بيانات تجريبية: ليست قياسات حقيقية';

export const FRAME_BANNER =
  'MAP FRAMES ARE STAND-INS: the series is real / إطارات الخريطة مولّدة: السلسلة حقيقية';
