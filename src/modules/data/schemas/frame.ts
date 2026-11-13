import * as z from 'zod';
import { TimeValue } from './common';

export const FrameSchema = z.object({
  t: TimeValue,
  src: z.string().min(1),
  value: z.string().optional(),
  grid: z.string().optional(),
  q: z.enum(['ok', 'missing', 'estimated']).default('ok'),
  sample: z.boolean().optional(),
});
export type Frame = z.infer<typeof FrameSchema>;

export function timesIncrease(values: readonly (number | string)[]): boolean {
  let prev: string | null = null;
  for (const value of values) {
    const key = String(value);
    if (prev !== null && key <= prev) return false;
    prev = key;
  }
  return true;
}
