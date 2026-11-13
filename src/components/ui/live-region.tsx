'use client';

import { useEffect, useState } from 'react';
import { subscribeAnnouncements } from '@/modules/narration';

export function LiveRegion() {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  useEffect(
    () =>
      subscribeAnnouncements((item) => {
        const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
        const text = lang === 'ar' ? item.ar : item.en;
        if (item.priority === 'assertive') setAssertive(text);
        else setPolite(text);
      }),
    [],
  );
  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
    </>
  );
}
