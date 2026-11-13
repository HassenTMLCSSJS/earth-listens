import { setRequestLocale } from 'next-intl/server';
import { GuidePage } from '@/components/info-pages';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GuidePage />;
}
