'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

/**
 * A short returning lockup. The hub is already mounted underneath; this only
 * covers it for 1.2 s (600 ms with reduced motion) while the welcome line plays.
 */
export function ReturningSting({ onDone }: { onDone: () => void }) {
  const t = useTranslations('entry');

  useEffect(() => {
    const reduced =
      document.documentElement.dataset.motion === 'reduce' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    const timer = window.setTimeout(onDone, reduced ? 600 : 1200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div data-testid="returning-sting" className="returning-sting">
      <div className="returning-lockup" role="status" aria-live="polite">
        <svg width="72" height="72" viewBox="0 0 32 32" aria-hidden="true">
          <defs>
            <radialGradient id="returning-globe" cx="40%" cy="35%" r="70%">
              <stop offset="0" stopColor="#9fe3ff" />
              <stop offset="0.55" stopColor="#2a78c9" />
              <stop offset="1" stopColor="#0b1020" />
            </radialGradient>
          </defs>
          <circle cx="16" cy="16" r="8.5" fill="url(#returning-globe)" />
          <ellipse
            cx="16"
            cy="16"
            rx="14"
            ry="5.2"
            fill="none"
            stroke="#f2c46d"
            strokeWidth="1.4"
            transform="rotate(-18 16 16)"
          />
          <circle cx="28.6" cy="11.6" r="1.8" fill="#ffd98a" />
        </svg>
        <span>{t('title')}</span>
      </div>
    </div>
  );
}
