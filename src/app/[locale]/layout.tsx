import {
  Alexandria,
  IBM_Plex_Mono,
  IBM_Plex_Sans_Arabic,
  Instrument_Serif,
  Inter,
  Space_Grotesk,
} from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { routing } from '@/i18n/routing';
import { Shell } from '@/components/shell';
import '@/styles/globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-space-grotesk',
  display: 'swap',
  preload: false,
});
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['italic', 'normal'],
  variable: '--font-instrument-serif',
  display: 'swap',
  preload: false,
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
  preload: false,
});
const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-alexandria',
  display: 'swap',
  preload: false,
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-arabic',
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
  const fonts = [
    spaceGrotesk.variable,
    instrumentSerif.variable,
    inter.variable,
    plexMono.variable,
    alexandria.variable,
    plexArabic.variable,
  ].join(' ');
  return (
    <html lang={locale} dir={dir} className={fonts}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Shell locale={locale}>{children}</Shell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
