/** Equirectangular region stats. Mean is cosine-weighted. Percentiles are unweighted. */
export function gridRegionStats(
  values: ArrayLike<number>,
  width: number,
  height: number,
  bbox: readonly [number, number, number, number],
): { mean: number | null; p5: number | null; p95: number | null; nValid: number } {
  const [west, south, east, north] = bbox;
  const x0 = Math.max(0, Math.floor(((west + 180) / 360) * width));
  const x1 = Math.min(width, Math.ceil(((east + 180) / 360) * width));
  const y0 = Math.max(0, Math.floor(((90 - north) / 180) * height));
  const y1 = Math.min(height, Math.ceil(((90 - south) / 180) * height));
  let num = 0;
  let den = 0;
  const samples: number[] = [];
  for (let y = y0; y < y1; y += 1) {
    const lat = 90 - ((y + 0.5) / height) * 180;
    const weight = Math.cos((lat * Math.PI) / 180);
    for (let x = x0; x < x1; x += 1) {
      const value = values[y * width + x];
      if (value === undefined || !Number.isFinite(value)) continue;
      num += value * weight;
      den += weight;
      samples.push(value);
    }
  }
  samples.sort((a, b) => a - b);
  const pick = (p: number) => {
    if (samples.length === 0) return null;
    const index = Math.min(
      samples.length - 1,
      Math.max(0, Math.round((p / 100) * (samples.length - 1))),
    );
    return samples[index] ?? null;
  };
  return {
    mean: den === 0 ? null : num / den,
    p5: pick(5),
    p95: pick(95),
    nValid: samples.length,
  };
}

export interface TierInput {
  quality: 'auto' | '4k' | '8k';
  mobile: boolean;
  coarsePointer: boolean;
  maxTextureSize: number;
  deviceMemory?: number;
  ktx2: boolean;
  smooth4k: boolean;
}

export interface TierChoice {
  tier: 1 | 2 | 3;
  texture: 2048 | 4096 | 8192;
  segments: [number, number];
  dpr: number;
  displacement: boolean;
  prefetch: 1 | 2;
}

export function chooseTier(input: TierInput): TierChoice {
  const strong =
    !input.mobile &&
    !input.coarsePointer &&
    input.maxTextureSize >= 8192 &&
    input.ktx2 &&
    (input.deviceMemory === undefined || input.deviceMemory >= 8) &&
    input.smooth4k;
  if (input.quality === '8k' && input.maxTextureSize >= 8192) {
    return {
      tier: 3,
      texture: 8192,
      segments: [512, 256],
      dpr: 2,
      displacement: true,
      prefetch: 2,
    };
  }
  if (input.quality === '4k') {
    return {
      tier: 2,
      texture: 4096,
      segments: [256, 128],
      dpr: 2,
      displacement: true,
      prefetch: 2,
    };
  }
  if (input.mobile || input.coarsePointer) {
    return {
      tier: 1,
      texture: 2048,
      segments: [128, 64],
      dpr: 1.5,
      displacement: false,
      prefetch: 1,
    };
  }
  if (input.quality === 'auto' && strong) {
    return {
      tier: 3,
      texture: 8192,
      segments: [512, 256],
      dpr: 2,
      displacement: true,
      prefetch: 2,
    };
  }
  return { tier: 2, texture: 4096, segments: [256, 128], dpr: 2, displacement: true, prefetch: 2 };
}
