'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, Square } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { useAppStore } from '@/core/store';
import { getPlayer } from '@/modules/sonification';
import { LogoMark } from '@/components/brand/logo-mark';
import { cn } from '@/lib/utils';
import { NowPlaying } from './now-playing';
import { LangToggle } from './lang-toggle';
import { ModeToggle } from './mode-toggle';
import { LearnMenu } from './learn-menu';
import { MobileMenu } from './mobile-menu';
import { PRIMARY_NAV, PRIMARY_TAIL } from './nav-items';

const RAIL_LINK =
  'relative inline-flex h-[38px] items-center gap-1.5 rounded-full px-3.5 text-[0.9375rem] font-medium text-ink-muted transition-colors hover:bg-space-700 hover:text-ink';

export function SiteHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const dispatch = useAppStore((state) => state.dispatch);
  const [menu, setMenu] = useState(false);

  const isCurrent = (href: string) => pathname === href;

  return (
    <>
      <header className="site-header border-line bg-glass fixed inset-x-4 top-3 z-40 mx-auto flex h-14 max-w-[1320px] items-center gap-2 rounded-full border px-2.5 shadow-[var(--shadow-hairline)] backdrop-blur-[18px] backdrop-saturate-150">
        <Link
          href="/"
          aria-label={t('header.home')}
          className="font-display hover:bg-space-700 flex h-11 items-center gap-2.5 rounded-full px-1.5 pe-3.5 text-[1.0625rem] font-semibold whitespace-nowrap transition-colors"
        >
          <LogoMark />
          <span lang="en" dir="ltr" className="inline">
            Earth Listens
          </span>
        </Link>

        <div aria-hidden="true" className="flex-1 min-[1100px]:hidden" />

        <nav
          aria-label={t('nav.label')}
          className="border-line mx-auto hidden items-center gap-0.5 rounded-full border bg-white/[0.03] p-1 min-[1100px]:flex"
        >
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
              className={cn(RAIL_LINK, isCurrent(item.href) && 'bg-space-700 text-ink')}
            >
              {t(item.label)}
              {isCurrent(item.href) ? (
                <span
                  aria-hidden="true"
                  className="bg-gold absolute start-1/2 bottom-[5px] ms-[-2px] size-1 rounded-full shadow-[var(--shadow-glow-gold)]"
                />
              ) : null}
            </Link>
          ))}
          <LearnMenu />
          {PRIMARY_TAIL.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
              className={cn(RAIL_LINK, isCurrent(item.href) && 'bg-space-700 text-ink')}
            >
              {t(item.label)}
              {isCurrent(item.href) ? (
                <span
                  aria-hidden="true"
                  className="bg-gold absolute start-1/2 bottom-[5px] ms-[-2px] size-1 rounded-full shadow-[var(--shadow-glow-gold)]"
                />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <NowPlaying className="hidden sm:inline-flex" />
          <LangToggle className="hidden sm:inline-flex" />
          <ModeToggle className="hidden min-[1100px]:inline-flex" />
          <button
            type="button"
            aria-label={t('header.stop')}
            title={t('header.stop')}
            onClick={() => {
              getPlayer().stop();
              dispatch({ type: 'stop' }, 'pointer');
            }}
            className="text-ink-muted hover:bg-space-700 hover:text-ink inline-flex size-11 items-center justify-center rounded-full transition-colors"
          >
            <Square className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
          <Link
            href="/settings"
            aria-label={t('nav.settings')}
            title={t('nav.settings')}
            className="text-ink-muted hover:bg-space-700 hover:text-ink inline-flex size-11 items-center justify-center rounded-full transition-colors"
          >
            <Settings className="size-[19px]" strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <button
            type="button"
            aria-label={t('nav.menu')}
            title={t('nav.menu')}
            aria-expanded={menu}
            aria-controls="mobile-menu"
            onClick={() => setMenu(true)}
            className="text-ink-muted hover:bg-space-700 hover:text-ink inline-flex size-11 items-center justify-center rounded-full transition-colors min-[1100px]:hidden"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </button>
        </div>
      </header>
      <MobileMenu open={menu} onOpenChange={setMenu} />
    </>
  );
}
