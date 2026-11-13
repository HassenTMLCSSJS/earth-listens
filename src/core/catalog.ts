'use client';

import { create } from 'zustand';
import { LAYER_IDS, type LayerId } from '@/core/actions';
import { loadRegistry, type LoadedLayer, type QuizFile } from '@/modules/data';
import { useAppStore } from '@/core/store';

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
  if (typeof document === 'undefined') return;
  const urls = new Set<string>();
  for (const sheet of document.styleSheets) {
    let text = '';
    try {
      text = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n');
    } catch {
      continue;
    }
    for (const match of text.matchAll(/url\(["']?([^"')]+\.woff2)["']?\)/g)) {
      const raw = match[1];
      if (!raw) continue;
      urls.add(new URL(raw, sheet.href ?? location.href).href);
    }
  }
  await Promise.all([...urls].map((url) => fetch(url).then((response) => response.blob())));
}

async function asBlob(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) return url;
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export const useContent = create<ContentState>((set, get) => ({
  ready: false,
  texture: '/textures/earth-day.jpg',
  explanations: [],
  quiz: null,
  async load() {
    if (get().ready) return;
    const registry = await loadRegistry();
    const layers = await Promise.all(LAYER_IDS.map((id) => registry.get(id)));
    const frameUrls = [
      ...new Set(layers.flatMap((layer) => layer.data.frames.map((frame) => frame.src))),
    ];
    const blobs = new Map<string, string>();
    await Promise.all(
      frameUrls.map(async (url) => {
        blobs.set(url, await asBlob(url));
      }),
    );
    const texture = await asBlob('/textures/earth-day.jpg');
    await preloadFonts();
    const catalog: Partial<Record<LayerId, LoadedLayer>> = {};
    for (const layer of layers) {
      catalog[layer.config.id] = {
        ...layer,
        data: {
          ...layer.data,
          frames: layer.data.frames.map((frame) => ({
            ...frame,
            src: blobs.get(frame.src) ?? frame.src,
          })),
        },
      };
    }
    const [explanations, quiz] = await Promise.all([
      fetch('/data/explanations/all.json').then(
        (response) => response.json() as Promise<{ items: ExplanationItem[] }>,
      ),
      fetch('/data/quiz/clips.sample.json').then(
        (response) => response.json() as Promise<QuizFile>,
      ),
      fetch('/data/regions.json'),
      fetch('/audio/narration/manifest.json'),
    ]);
    useAppStore.getState().setCatalog(catalog);
    set({ ready: true, texture, explanations: explanations.items, quiz });
  },
}));
