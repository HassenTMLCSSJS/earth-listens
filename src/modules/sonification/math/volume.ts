import {
  GAIN_CEILING_DB,
  MASTER_MAX_DB,
  MASTER_MIN_DB,
  STRENGTH_DB_LO,
  STRENGTH_DB_SPAN,
} from '../constants';
import { clamp } from './round';

export function strengthDb(n: number): number {
  return STRENGTH_DB_LO + STRENGTH_DB_SPAN * n;
}

export function voiceCountDb(nVoices: number): number {
  const n = Math.max(1, nVoices);
  return -10 * Math.log10(n);
}

export function symphonyTrimDb(layerCount = 4): number {
  return -10 * Math.log10(Math.max(1, layerCount));
}

export function combineGain(strength: number, voices: number, back: number, trim: number): number {
  return Math.min(GAIN_CEILING_DB, strength + voices + back + trim);
}

export function dbToLinear(db: number): number {
  return 10 ** (db / 20);
}

export function clampMasterDb(db: number): number {
  return clamp(db, MASTER_MIN_DB, MASTER_MAX_DB);
}
