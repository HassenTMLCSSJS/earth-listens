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
  await Promise.all([...urls].map((url) => fetch(url).then((response) => response.blob())));
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
      ...new Set(
        layers.flatMap((layer) => {
          const latest = layer.data.frames.at(-1);
          return latest ? [latest.src] : [];
        }),
      ),
    ];
    await Promise.all([...frameUrls.map((url) => fetch(url)), fetch('/textures/earth-day.jpg')]);
    await preloadFonts();
    const catalog: Partial<Record<LayerId, LoadedLayer>> = {};
    for (const layer of layers) {
      catalog[layer.config.id] = layer;
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
    set({ ready: true, explanations: explanations.items, quiz });
  },
}));
