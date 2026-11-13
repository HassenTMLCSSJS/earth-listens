import { IBM_Plex_Sans_Arabic, Inter, Space_Grotesk } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { routing } from '@/i18n/routing';
import { Shell } from '@/components/shell';
import '@/styles/globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: '500',
  display: 'swap',
  preload: false,
});
const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: '400',
  display: 'swap',
  preload: false,
});
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  weight: ['400', '500'],
  display: 'swap',
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('title'), description: t('description') };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <html
      lang={locale}
      dir={dir}
      className={
        locale === 'ar'
          ? `${arabic.variable} ${display.variable}`
          : `${display.variable} ${sans.variable}`
      }
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <Shell locale={locale}>{children}</Shell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
