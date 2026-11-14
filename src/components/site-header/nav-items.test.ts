import { describe, expect, it } from 'vitest';
import { NAV_HREFS } from '@/core/actions';
import {
  FOOTER_COLUMNS,
  isLearnRoute,
  LEARN_NAV,
  MOBILE_NAV,
  PRIMARY_NAV,
  PRIMARY_TAIL,
} from './nav-items';

describe('header navigation', () => {
  it('lists the eight numbered mobile destinations in reading order', () => {
    expect(MOBILE_NAV.map((item) => item.href)).toEqual([
      '/',
      '/listen',
      '/tutorial',
      '/how-it-sounds',
      '/quiz',
      '/symphony',
      '/data',
      '/about',
    ]);
    expect(new Set(MOBILE_NAV.map((item) => item.href)).size).toBe(MOBILE_NAV.length);
  });

  it('only points at routes the action schema knows', () => {
    for (const item of [...MOBILE_NAV, ...PRIMARY_NAV, ...PRIMARY_TAIL, ...LEARN_NAV]) {
      expect(NAV_HREFS).toContain(item.href);
    }
  });

  it('marks the four Learn routes as active and leaves Explore alone', () => {
    expect(LEARN_NAV).toHaveLength(4);
    for (const item of LEARN_NAV) expect(isLearnRoute(item.href)).toBe(true);
    expect(isLearnRoute('/listen')).toBe(false);
    expect(isLearnRoute('/about')).toBe(false);
  });

  it('builds four footer columns with an external GitHub link', () => {
    expect(FOOTER_COLUMNS).toHaveLength(4);
    const github = FOOTER_COLUMNS.flatMap((column) => column.items).find((item) =>
      item.href.includes('github.com'),
    );
    expect(github?.external).toBe(true);
  });
});
