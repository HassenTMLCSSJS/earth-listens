import type { EarconId } from '@/modules/sonification';

/** Spoken names for the fixed earcons. Captions and Chatterbox clips use the same words. */
export const EARCON_LABELS: Record<EarconId, { en: string; ar: string }> = {
  start: { en: 'Start.', ar: 'بدأنا.' },
  stop: { en: 'Stopped.', ar: 'وقفنا.' },
  layer_added: { en: 'Voice added.', ar: 'ضفنا صوت.' },
  region_changed: { en: 'Place changed.', ar: 'غيّرنا المكان.' },
  record: { en: 'A record.', ar: 'رقم قياسي.' },
  missing: { en: 'No data here.', ar: 'مفيش بيانات هنا.' },
  out_of_range: { en: 'Out of range.', ar: 'برّه المدى.' },
  quiz_correct: { en: 'Correct.', ar: 'صح.' },
  quiz_wrong: { en: 'Not this time.', ar: 'مش المرة دي.' },
  listening: { en: "I'm listening.", ar: 'سامعك.' },
  error: { en: 'Something went wrong.', ar: 'حصلت مشكلة.' },
  fire: { en: 'Wildfire.', ar: 'حريقة.' },
  volcano: { en: 'Volcano.', ar: 'بركان.' },
  storm: { en: 'Storm.', ar: 'عاصفة.' },
  ice: { en: 'Ice.', ar: 'جليد.' },
  flood: { en: 'Flood.', ar: 'فيضان.' },
  event: { en: 'Natural event.', ar: 'حدث طبيعي.' },
};
