/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ speak: vi.fn(), replace: vi.fn() }));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/modules/narration', () => ({
  narrationText: (id: string) => ({ en: `n.${id}`, ar: `n.${id}` }),
  narrationSafetyMs: () => 10500,
  speakNarration: mocks.speak,
}));

vi.mock('@/modules/sonification', () => ({
  getPlayer: () => ({ init: () => Promise.resolve(), earcon: vi.fn() }),
  unlockAudio: vi.fn(),
}));

vi.mock('@/components/entry/intro-stage', () => ({
  IntroStage: () => <div data-testid="intro-stage" />,
}));

vi.mock('@/components/entry/choice-hub', () => ({
  ChoiceHub: () => <div data-testid="choice-hub" />,
}));

import { HomeExperience } from './home-experience';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  mocks.replace.mockClear();
  mocks.speak.mockReset();
  mocks.speak.mockImplementation(
    () => new Promise<void>((resolve) => window.setTimeout(resolve, 2000)),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function flush(ms = 0) {
  await act(async () => {
    if (ms > 0) vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('home entry timing', () => {
  it('waits for the prompt narration to finish before listening', async () => {
    render(<HomeExperience />);
    await flush();

    const begin = screen.getByRole('button', { name: 'entry.sound' });
    act(() => begin.click());
    await flush();

    const state = screen.getByTestId('entry-state');
    expect(state).toHaveAttribute('data-state', 'prompt');
    expect(mocks.speak).toHaveBeenCalledWith('gate.prompt', 'en');

    // The old fixed timer moved on at 0.9 s and cut the sentence in half.
    await flush(900);
    expect(state).toHaveAttribute('data-state', 'prompt');

    await flush(1100);
    expect(state).toHaveAttribute('data-state', 'listen1');
  });
});
