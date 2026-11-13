import { setRequestLocale } from 'next-intl/server';
import { TutorialPanel } from '@/components/tutorial-panel';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TutorialPanel />;
}
