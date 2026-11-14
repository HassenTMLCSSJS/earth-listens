import type { NarrationId } from '@/modules/narration';
import { closingLine } from './config';

export interface IntroCue {
  id: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7';
  line: NarrationId;
  seqFrom: number;
  seqTo: number;
  scene: number;
  haptic: number[];
}

export const INTRO_CUES: IntroCue[] = [
  { id: 'C1', line: 'intro.l1', seqFrom: 10, seqTo: 22, scene: 2, haptic: [60, 120, 60] },
  { id: 'C2', line: 'intro.l2', seqFrom: 22, seqTo: 36, scene: 3, haptic: [200, 100, 300] },
  { id: 'C3', line: 'intro.l3', seqFrom: 36, seqTo: 48, scene: 4, haptic: [20] },
  { id: 'C4', line: 'intro.l4', seqFrom: 48, seqTo: 78, scene: 5, haptic: [30] },
  { id: 'C5', line: 'intro.l5', seqFrom: 78, seqTo: 88, scene: 7, haptic: [] },
  { id: 'C6', line: 'intro.l6', seqFrom: 88, seqTo: 94, scene: 8, haptic: [80, 40, 80, 40, 200] },
  {
    id: 'C7',
    line: closingLine(),
    seqFrom: 94,
    seqTo: 100,
    scene: 8,
    haptic: [30, 40, 30],
  },
];
