import type { EarconId } from '@/modules/sonification';

/** Spoken names for the fixed earcons. Captions and Chatterbox clips use the same words. */
export const EARCON_LABELS: Record<EarconId, { en: string; ar: string }> = {
  start: { en: 'Start.', ar: 'ابدأ.' },
  stop: { en: 'Stop.', ar: 'توقّف.' },
  layer_added: { en: 'Layer added.', ar: 'أُضيفت طبقة.' },
  region_changed: { en: 'Region changed.', ar: 'تغيّرت المنطقة.' },
  record: { en: 'Record value.', ar: 'قيمة قياسية.' },
  missing: { en: 'No data.', ar: 'لا توجد بيانات.' },
  out_of_range: { en: 'Out of range.', ar: 'خارج المدى.' },
  quiz_correct: { en: 'Correct.', ar: 'إجابة صحيحة.' },
  quiz_wrong: { en: 'Not this time.', ar: 'ليست هذه المرة.' },
  listening: { en: 'Listening.', ar: 'أستمع.' },
  error: { en: 'Something went wrong.', ar: 'حدث خطأ.' },
  fire: { en: 'Wildfire.', ar: 'حريق.' },
  volcano: { en: 'Volcano.', ar: 'بركان.' },
  storm: { en: 'Storm.', ar: 'عاصفة.' },
  ice: { en: 'Ice.', ar: 'جليد.' },
  flood: { en: 'Flood.', ar: 'فيضان.' },
  event: { en: 'Natural event.', ar: 'حدث طبيعي.' },
};
