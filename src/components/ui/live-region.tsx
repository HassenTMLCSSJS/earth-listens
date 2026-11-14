'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeAnnouncements } from '@/modules/narration';

/** Visible live-region text must never linger; assistive tech only needs it once. */
const CLEAR_AFTER_MS = 5000;

export function LiveRegion() {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const timers = useRef<{
    polite?: ReturnType<typeof setTimeout>;
    assertive?: ReturnType<typeof setTimeout>;
  }>({});

  useEffect(() => {
    const state = timers.current;
    const unsubscribe = subscribeAnnouncements((item) => {
      const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
      const text = lang === 'ar' ? item.ar : item.en;
      if (!text) return;
      if (item.priority === 'assertive') {
        clearTimeout(state.assertive);
        setAssertive(text);
        state.assertive = setTimeout(() => setAssertive(''), CLEAR_AFTER_MS);
      } else {
        clearTimeout(state.polite);
        setPolite(text);
        state.polite = setTimeout(() => setPolite(''), CLEAR_AFTER_MS);
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(state.polite);
      clearTimeout(state.assertive);
    };
  }, []);

  return (
    <>
      <div data-testid="live-polite" className="sr-only" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div
        data-testid="live-assertive"
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
      >
        {assertive}
      </div>
    </>
  );
}
