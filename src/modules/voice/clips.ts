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
let loading: Promise<void> | null = null;

/**
 * Fetch the manifest and same-origin MP3s into memory.
 * Called from the catalog load so a later offline page does not request them again.
 */
export function preloadNarrationClips(): Promise<void> {
  if (clips) return Promise.resolve();
  loading ??= (async () => {
    const map = new Map<string, NarrationClip>();
    try {
      const response = await fetch(MANIFEST_URL);
      if (!response.ok) {
        clips = map;
        return;
      }
      const body = (await response.json()) as { items?: NarrationClip[] };
      await Promise.all(
        (body.items ?? []).map(async (item) => {
          if ((item.lang !== 'en' && item.lang !== 'ar') || !item.hash || !item.url) return;
          const stored: NarrationClip = { ...item };
          if (item.url.startsWith('/')) {
            try {
              const file = await fetch(item.url);
              if (file.ok) stored.url = URL.createObjectURL(await file.blob());
            } catch {
              /* Keep the path. Playback falls through if it fails. */
            }
          }
          map.set(`${item.lang}:${item.hash}`, stored);
        }),
      );
    } catch {
      /* No clips. The live chain still speaks. */
    }
    clips = map;
  })();
  return loading;
}

export async function findNarrationClip(lang: Lang, text: string): Promise<NarrationClip | null> {
  if (!clips) return null;
  const key = await narrationKey(lang, text);
  return clips.get(`${lang}:${key}`) ?? null;
}

/** Test hook. Production code uses preloadNarrationClips. */
export function resetNarrationClipsForTests(): void {
  clips = null;
  loading = null;
}
