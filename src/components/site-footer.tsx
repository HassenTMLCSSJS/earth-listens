'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAppStore } from '@/core/store';
import { FOOTER_COLUMNS } from '@/components/site-header/nav-items';

export function SiteFooter() {
  const t = useTranslations();
  const router = useRouter();
  const markIntroSeen = useAppStore((state) => state.markIntroSeen);
  return (
    <footer className="border-line relative z-10 mt-24 overflow-hidden border-t bg-[linear-gradient(180deg,transparent,rgb(11_16_32/.9))] px-[clamp(20px,3.4vw,48px)] pt-24 pb-10">
      <div aria-hidden="true" className="nebula opacity-60" />
      <div className="relative mx-auto max-w-[1320px]">
        <p className="font-display text-ink mb-16 max-w-[14ch] text-[clamp(2.5rem,8vw,8.5rem)] leading-[0.95] tracking-[-0.03em] rtl:leading-[1.15] rtl:tracking-normal">
          {t('footer.big')}
        </p>
        <div className="grid max-w-[1320px] grid-cols-2 gap-8 md:grid-cols-4">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-micro text-ink-subtle rtl:font-ar mb-3.5 font-mono tracking-[0.14em] uppercase rtl:tracking-normal rtl:normal-case">
                {t(column.title)}
              </h3>
              <ul>
                {column.items.map((item) => (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener"
                        className="text-ink-muted hover:text-ink block py-[7px] transition-colors"
                      >
                        {t(item.label)}
                        <span className="sr-only"> ({t('a11y.newWindow')})</span>
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-ink-muted hover:text-ink block py-[7px] transition-colors"
                      >
                        {t(item.label)}
                      </Link>
                    )}
                  </li>
                ))}
                {column.title === 'footer.access' ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        markIntroSeen(false);
                        sessionStorage.setItem('el.replay', '1');
                        router.push('/');
                      }}
                      className="text-ink-muted hover:text-ink block py-[7px] text-start transition-colors"
                    >
                      {t('footer.replay')}
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-line text-ink-subtle mt-14 flex max-w-[1320px] flex-wrap justify-between gap-x-7 gap-y-3 border-t pt-6 text-sm">
          <span>{t('footer.credit')}</span>
          <span>{t('footer.nasa')}</span>
          <span>{t('footer.license')}</span>
          <span>{t('footer.madeIn')}</span>
        </div>
      </div>
    </footer>
  );
}
