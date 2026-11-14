'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { NavigationMenu } from 'radix-ui';
import { Link, usePathname } from '@/i18n/navigation';
import { isLearnRoute, LEARN_NAV } from './nav-items';
import { NavIconGlyph } from './nav-icon';

export function LearnMenu() {
  const t = useTranslations();
  const pathname = usePathname();
  const active = isLearnRoute(pathname);
  return (
    <NavigationMenu.Root aria-label={t('nav.learn')} className="relative">
      <NavigationMenu.List className="flex items-center">
        <NavigationMenu.Item className="relative">
          <NavigationMenu.Trigger
            data-active={active ? 'true' : undefined}
            aria-current={active ? 'page' : undefined}
            className="group text-ink-muted hover:bg-space-700 hover:text-ink data-[state=open]:bg-space-700 data-[state=open]:text-ink data-[active=true]:bg-space-700 data-[active=true]:text-ink flex h-[38px] items-center gap-1.5 rounded-full px-3.5 text-[0.9375rem] font-medium transition-colors"
          >
            {t('nav.learn')}
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform duration-300 group-data-[state=open]:rotate-180"
              strokeWidth={1.75}
            />
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="border-line bg-glass absolute start-1/2 top-[calc(100%+10px)] z-50 w-[520px] -translate-x-1/2 rounded-3xl border p-2.5 shadow-[var(--shadow-float)] backdrop-blur-[18px] rtl:translate-x-1/2">
            <ul className="grid grid-cols-2 gap-1.5">
              {LEARN_NAV.map((item) => (
                <li key={item.href}>
                  <NavigationMenu.Link asChild>
                    <Link
                      href={item.href}
                      className="text-ink hover:bg-space-700 focus-visible:bg-space-700 grid grid-cols-[40px_1fr] items-start gap-3 rounded-2xl p-3 transition-colors"
                    >
                      <span className="bg-space-700 text-gold grid size-10 place-items-center rounded-xl">
                        <NavIconGlyph icon={item.icon ?? 'info'} size={20} />
                      </span>
                      <span>
                        <b className="block text-[0.9375rem] font-semibold">{t(item.label)}</b>
                        {item.body ? (
                          <small className="text-ink-subtle mt-0.5 block text-[0.8125rem] leading-[1.4]">
                            {t(item.body)}
                          </small>
                        ) : null}
                      </span>
                    </Link>
                  </NavigationMenu.Link>
                </li>
              ))}
            </ul>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
