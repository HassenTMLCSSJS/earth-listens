import { setRequestLocale } from 'next-intl/server';
import { DataPage } from '@/components/info-pages';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DataPage />;
}
