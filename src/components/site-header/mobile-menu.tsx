'use client';

import { useLocale, useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { useAppStore } from '@/core/store';
import { speakNarration } from '@/modules/narration';
import { LogoMark } from '@/components/brand/logo-mark';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { MOBILE_NAV } from './nav-items';
import { LangToggle } from './lang-toggle';
import { ModeToggle } from './mode-toggle';

export function MobileMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = useLocale() === 'ar' ? 'ar' : 'en';
  const mode = useAppStore((state) => state.mode);
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next && mode === 'audio_first') void speakNarration('menu.main', locale);
      }}
    >
      <SheetContent
        side="top"
        showCloseButton={false}
        className="h-dvh max-h-none gap-0 rounded-none border-0 bg-[rgb(5_7_13/.97)] p-0 backdrop-blur-xl"
      >
        <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
        <div
          id="mobile-menu"
          className="mx-auto flex h-full w-full max-w-[1320px] flex-col px-6 pt-3 pb-8"
        >
          <div className="flex h-14 items-center justify-between">
            <Link
              href="/"
              aria-label={t('header.home')}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2.5 rounded-full ps-1.5 pe-3.5"
            >
              <LogoMark />
              <span lang="en" dir="ltr" className="font-display text-[1.0625rem] font-semibold">
                Earth Listens
              </span>
            </Link>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t('nav.closeMenu')}
              className="text-ink-muted hover:bg-space-700 hover:text-ink inline-flex size-11 items-center justify-center rounded-full transition-colors"
            >
              <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label={t('nav.label')} className="mt-8 flex-1 overflow-y-auto">
            <ul>
              {MOBILE_NAV.map((item, index) => {
                const current = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? 'page' : undefined}
                      onClick={() => onOpenChange(false)}
                      className="border-line text-ink hover:text-gold aria-[current=page]:text-gold flex items-baseline gap-4 border-b py-3 text-[clamp(1.75rem,8vw,2.5rem)] leading-[1.1] font-medium transition-colors"
                    >
                      <small className="text-micro text-gold font-mono">
                        {String(index + 1).padStart(2, '0')}
                      </small>
                      <span className="font-display">{t(item.label)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <LangToggle full />
            <ModeToggle />
            <Link
              href="/settings"
              onClick={() => onOpenChange(false)}
              className="border-line-strong text-label hover:bg-space-700 inline-flex h-11 items-center rounded-full border bg-white/[0.04] px-5 font-medium transition-colors"
            >
              {t('nav.settings')}
            </Link>
            <Link
              href="/guide"
              onClick={() => onOpenChange(false)}
              className="border-line-strong text-label hover:bg-space-700 inline-flex h-11 items-center rounded-full border bg-white/[0.04] px-5 font-medium transition-colors"
            >
              {t('nav.guide')}
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
