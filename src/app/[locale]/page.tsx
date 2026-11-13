import { setRequestLocale } from 'next-intl/server';
import { HomeExperience } from '@/components/home-experience';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeExperience />;
}
