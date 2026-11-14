import type { Lang } from '@/core/actions';

const MANIFEST_URL = '/data/narration.manifest.json';

export interface NarrationClip {
  hash: string;
  lang: Lang;
  url: string;
  duration?: number;
}

/** sha256(utf-8 of lang + newline + text). Same formula as pipeline/earth_pipeline/narration.py. */
export async function narrationKey(lang: Lang, text: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${lang}\n${text}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

let clips: Map<string, NarrationClip> | null = null;
let manifestLoad: Promise<Map<string, NarrationClip>> | null = null;
let preloading: Promise<void> | null = null;

/**
 * Load only the manifest, never the audio bodies. The first spoken line must
 * find its recorded MP3 before a fallback voice can ever be considered.
 */
function loadManifest(): Promise<Map<string, NarrationClip>> {
  if (clips) return Promise.resolve(clips);
  manifestLoad ??= (async () => {
    const map = new Map<string, NarrationClip>();
    try {
      const response = await fetch(MANIFEST_URL);
      if (response.ok) {
        const body = (await response.json()) as { items?: NarrationClip[] };
        for (const item of body.items ?? []) {
          if ((item.lang !== 'en' && item.lang !== 'ar') || !item.hash || !item.url) continue;
          map.set(`${item.lang}:${item.hash}`, { ...item });
        }
      }
    } catch {
      /* No clips. Captions still carry the line. */
    }
    clips = map;
    return map;
  })();
  return manifestLoad;
}

/**
 * Fetch the manifest and same-origin MP3s into memory.
 * Called from the catalog load so a later offline page does not request them again.
 */
export function preloadNarrationClips(): Promise<void> {
  if (preloading) return preloading;
  preloading = (async () => {
    const map = await loadManifest();
    await Promise.all(
      [...map.entries()].map(async ([key, stored]) => {
        if (!stored.url.startsWith('/')) return;
        try {
          const file = await fetch(stored.url);
          if (file.ok) map.set(key, { ...stored, url: URL.createObjectURL(await file.blob()) });
        } catch {
          /* Keep the path. Playback can still stream it. */
        }
      }),
    );
  })();
  return preloading;
}

export async function findNarrationClip(lang: Lang, text: string): Promise<NarrationClip | null> {
  const map = await loadManifest();
  const key = await narrationKey(lang, text);
  return map.get(`${lang}:${key}`) ?? null;
}

/** Test hook. Production code uses preloadNarrationClips. */
export function resetNarrationClipsForTests(): void {
  clips = null;
  manifestLoad = null;
  preloading = null;
}
