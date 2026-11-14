'use client';

import {
  BookOpen,
  CircleHelp,
  CircleCheckBig,
  Compass,
  Database,
  House,
  AudioWaveform,
  Music,
  Info,
} from 'lucide-react';
import type { NavIcon } from './nav-items';

const GLYPHS = {
  home: House,
  compass: Compass,
  book: BookOpen,
  wave: AudioWaveform,
  quiz: CircleCheckBig,
  symphony: Music,
  database: Database,
  info: Info,
} satisfies Record<NavIcon, typeof Info>;

export function NavIconGlyph({ icon, size = 18 }: { icon: NavIcon; size?: number }) {
  const Glyph = GLYPHS[icon] ?? CircleHelp;
  return <Glyph size={size} strokeWidth={1.75} aria-hidden="true" />;
}
