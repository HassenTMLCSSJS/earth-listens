import * as z from 'zod';

export const LAYER_IDS = ['temperature', 'wildfire', 'sea_ice', 'co2'] as const;
export const REGION_IDS = [
  'global',
  'egypt',
  'africa',
  'arctic',
  'europe',
  'asia',
  'americas',
  'oceania',
] as const;
export const LANGS = ['en', 'ar'] as const;
export const MODES = ['audio_first', 'visual'] as const;
export const SPEEDS = ['slow', 'normal', 'fast'] as const;
export const SCALE_IDS = [
  'pentatonic_major',
  'major',
  'chromatic',
  'maqam_rast',
  'maqam_bayati',
  'maqam_hijaz',
  'maqam_nahawand',
] as const;
export const TUNINGS = ['microtonal', 'twelve_tet'] as const;
export const QUIZ_ANSWERS = ['increased', 'decreased', 'unchanged'] as const;
export const ORIGINS = ['voice', 'keyboard', 'pointer', 'agent', 'tutorial', 'system'] as const;

export type LayerId = (typeof LAYER_IDS)[number];
export type RegionId = (typeof REGION_IDS)[number];
export type Lang = (typeof LANGS)[number];
export type Mode = (typeof MODES)[number];
export type Speed = (typeof SPEEDS)[number];
export type ScaleId = (typeof SCALE_IDS)[number];
export type TuningMode = (typeof TUNINGS)[number];
export type QuizAnswer = (typeof QUIZ_ANSWERS)[number];
export type Origin = (typeof ORIGINS)[number];

export interface Settings {
  speechRate: number;
  masterVolumeDb: number;
  highContrast: boolean;
  reducedMotion: 'system' | 'on' | 'off';
  screenReaderMode: boolean;
  captions: boolean;
}

export type SettingKey = keyof Settings;

export type Action =
  | { type: 'select_phenomenon'; id: LayerId }
  | { type: 'combine_layers'; ids: LayerId[] }
  | { type: 'set_region'; region: RegionId }
  | { type: 'set_time'; from?: number; to?: number }
  | { type: 'compare_times'; a: number; b: number }
  | { type: 'play'; speed?: Speed }
  | { type: 'stop' }
  | { type: 'explain_mapping'; id: LayerId | 'all' | 'current'; level: 'short' | 'detailed' }
  | { type: 'set_mode'; mode: Mode }
  | { type: 'start_quiz' }
  | { type: 'quiz_answer'; answer: QuizAnswer }
  | { type: 'describe_frame' }
  | { type: 'set_language'; lang: Lang }
  | { type: 'set_scale'; scale: ScaleId; tuning?: TuningMode }
  | { type: 'rotate_view'; dLon: number; dLat: number }
  | { type: 'set_view'; lat: number; lon: number }
  | { type: 'help' }
  | { type: 'skip' }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'set_setting'; key: SettingKey; value: Settings[SettingKey] };

const layerId = z.enum(LAYER_IDS);
const regionId = z.enum(REGION_IDS);

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('select_phenomenon'), id: layerId }),
  z.object({ type: z.literal('combine_layers'), ids: z.array(layerId).max(4) }),
  z.object({ type: z.literal('set_region'), region: regionId }),
  z.object({
    type: z.literal('set_time'),
    from: z.number().optional(),
    to: z.number().optional(),
  }),
  z.object({ type: z.literal('compare_times'), a: z.number(), b: z.number() }),
  z.object({ type: z.literal('play'), speed: z.enum(SPEEDS).optional() }),
  z.object({ type: z.literal('stop') }),
  z.object({
    type: z.literal('explain_mapping'),
    id: z.union([layerId, z.literal('all'), z.literal('current')]),
    level: z.enum(['short', 'detailed']),
  }),
  z.object({ type: z.literal('set_mode'), mode: z.enum(MODES) }),
  z.object({ type: z.literal('start_quiz') }),
  z.object({ type: z.literal('quiz_answer'), answer: z.enum(QUIZ_ANSWERS) }),
  z.object({ type: z.literal('describe_frame') }),
  z.object({ type: z.literal('set_language'), lang: z.enum(LANGS) }),
  z.object({
    type: z.literal('set_scale'),
    scale: z.enum(SCALE_IDS),
    tuning: z.enum(TUNINGS).optional(),
  }),
  z.object({ type: z.literal('rotate_view'), dLon: z.number(), dLat: z.number() }),
  z.object({
    type: z.literal('set_view'),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  z.object({ type: z.literal('help') }),
  z.object({ type: z.literal('skip') }),
  z.object({ type: z.literal('next') }),
  z.object({ type: z.literal('back') }),
  z.object({
    type: z.literal('set_setting'),
    key: z.enum([
      'speechRate',
      'masterVolumeDb',
      'highContrast',
      'reducedMotion',
      'screenReaderMode',
      'captions',
    ]),
    value: z.union([z.number(), z.boolean(), z.enum(['system', 'on', 'off'])]),
  }),
]);

export const AGENT_TOOL_NAMES = [
  'select_phenomenon',
  'combine_layers',
  'set_region',
  'set_time',
  'play',
  'stop',
  'explain_mapping',
  'set_mode',
  'start_quiz',
  'describe_frame',
  'set_language',
] as const;

export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

function stripUndefined<T extends object>(obj: T): T {
  const out = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

export function parseAction(input: unknown): Action | null {
  const result = ActionSchema.safeParse(input);
  if (!result.success) return null;
  const data = result.data;
  if (data.type === 'set_setting') {
    const ok =
      (data.key === 'speechRate' && typeof data.value === 'number') ||
      (data.key === 'masterVolumeDb' && typeof data.value === 'number') ||
      (data.key === 'highContrast' && typeof data.value === 'boolean') ||
      (data.key === 'reducedMotion' &&
        (data.value === 'system' || data.value === 'on' || data.value === 'off')) ||
      (data.key === 'screenReaderMode' && typeof data.value === 'boolean') ||
      (data.key === 'captions' && typeof data.value === 'boolean');
    if (!ok) return null;
  }
  return stripUndefined(data) as Action;
}
