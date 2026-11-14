/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}));

import { LangToggle } from './lang-toggle';
import { subscribe } from '@/core/bus';
import { useAppStore } from '@/core/store';
import type { Action } from '@/core/actions';

afterEach(cleanup);

describe('language toggle', () => {
  it('asks the shell to switch to the other locale, without losing the page', () => {
    useAppStore.setState({ lang: 'en' });
    const seen: Action[] = [];
    const off = subscribe('set_language', (action) => seen.push(action));
    render(<LangToggle full />);
    fireEvent.click(screen.getByRole('button', { name: 'عربي' }));
    off();
    expect(seen).toEqual([{ type: 'set_language', lang: 'ar' }]);
    expect(useAppStore.getState().lang).toBe('ar');
  });

  it('does nothing when the active locale is chosen again', () => {
    useAppStore.setState({ lang: 'en' });
    const seen: Action[] = [];
    const off = subscribe('set_language', (action) => seen.push(action));
    render(<LangToggle full />);
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    off();
    expect(seen).toEqual([]);
  });
});
