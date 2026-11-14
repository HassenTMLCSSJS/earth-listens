import { setRequestLocale } from 'next-intl/server';
import { SymphonyFinale } from '@/components/symphony-finale';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SymphonyFinale />;
}
