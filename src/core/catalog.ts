'use client';

import { create } from 'zustand';
import { LAYER_IDS, type LayerId } from '@/core/actions';
import {
  feedForEntry,
  loadLiveEnvelope,
  loadRegistry,
  mergeFeedEnvelope,
  type LoadedLayer,
  type QuizFile,
  type Registry,
} from '@/modules/data';
import { useAppStore } from '@/core/store';
import { preloadNarrationClips } from '@/modules/voice';

export interface ExplanationItem {
  id: LayerId;
  level: 'short' | 'detailed';
  text: { en: string; ar: string };
}

interface ContentState {
  ready: boolean;
  texture: string;
  explanations: ExplanationItem[];
  quiz: QuizFile | null;
  load: () => Promise<void>;
}

async function preloadFonts(): Promise<void> {
  if (typeof document === 'undefined' || typeof CSSFontFaceRule === 'undefined') return;
  const urls = new Set<string>();
  const lang = document.documentElement.lang;
  const family = lang === 'ar' ? /IBM Plex|Space Grotesk/ : /Inter|Space Grotesk/;
  for (const sheet of document.styleSheets) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const face = rule.style.getPropertyValue('font-family');
      if (!family.test(face)) continue;
      const src = rule.style.getPropertyValue('src');
      for (const match of src.matchAll(/url\(["']?([^"')]+\.woff2)["']?\)/g)) {
        const raw = match[1];
        if (!raw) continue;
        urls.add(new URL(raw, sheet.href ?? location.href).href);
      }
    }
  }
  await Promise.allSettled([...urls].map((url) => fetch(url).then((response) => response.blob())));
}

/**
 * Pull every registry feed in parallel, merge the newest point into its layer,
 * and swap the catalog in once. A failed feed keeps the bundled history and is
 * labelled with its fallback status, so one bad upstream never empties the app.
 */
async function hydrateLiveFeeds(
  layers: readonly LoadedLayer[],
  entries: Registry['layers'],
): Promise<void> {
  const jobs: { layer: LoadedLayer; feed: string }[] = [];
  for (const layer of layers) {
    const entry = entries.find((item) => item.id === layer.config.id);
    // Precipitation and events have no registry descriptor, so the helper falls
    // back to the static layer→feed map instead of silently skipping them.
    const feed = feedForEntry(layer.config.id, entry?.live?.feed);
    if (!feed) continue;
    jobs.push({ layer, feed });
  }
  if (jobs.length === 0) return;

  const settled = await Promise.allSettled(
    jobs.map(async ({ layer, feed }) => {
      const envelope = await loadLiveEnvelope(feed);
      return mergeFeedEnvelope(layer, envelope);
    }),
  );

  const current = useAppStore.getState().catalog;
  const next = { ...current };
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    const layer = result.value;
    next[layer.config.id] = layer;
  }
  if (Object.keys(next).length > 0) useAppStore.getState().setCatalog(next);
}

export const useContent = create<ContentState>((set, get) => ({
  ready: false,
  texture: '/textures/earth-day.jpg',
  explanations: [],
  quiz: null,
  async load() {
    if (get().ready) return;

    let registry: Awaited<ReturnType<typeof loadRegistry>>;
    try {
      registry = await loadRegistry();
    } catch {
      set({ ready: true });
      return;
    }
    const entries = registry.list();
    const settledLayers = await Promise.allSettled(LAYER_IDS.map((id) => registry.get(id)));
    const layers = settledLayers.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );

    const catalog: Partial<Record<LayerId, LoadedLayer>> = {};
    for (const layer of layers) catalog[layer.config.id] = layer;
    useAppStore.getState().setCatalog(catalog);

    const frameUrls = [
      ...new Set(
        layers.flatMap((layer) => {
          const latest = layer.data.frames.at(-1);
          return latest ? [latest.src] : [];
        }),
      ),
    ];
    await Promise.allSettled([
      ...frameUrls.map((url) => fetch(url)),
      fetch('/textures/earth-day.jpg'),
    ]);
    await preloadFonts().catch(() => undefined);

    // Static history is ready before any feed call, so the first command works
    // even when an upstream is slow. The live merge arrives a moment later.
    if (!useAppStore.getState().demo) {
      void hydrateLiveFeeds(layers, entries).catch(() => undefined);
    }

    const [explanations, quiz] = await Promise.allSettled([
      fetch('/data/explanations/all.json').then(
        (response) => response.json() as Promise<{ items: ExplanationItem[] }>,
      ),
      fetch('/data/quiz/clips.sample.json').then(
        (response) => response.json() as Promise<QuizFile>,
      ),
      fetch('/data/regions.json'),
      fetch('/audio/narration/manifest.json'),
      preloadNarrationClips(),
    ]);
    set({
      ready: true,
      explanations: explanations.status === 'fulfilled' ? explanations.value.items : [],
      quiz: quiz.status === 'fulfilled' ? quiz.value : null,
    });
  },
}));
