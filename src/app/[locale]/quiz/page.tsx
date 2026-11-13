import { setRequestLocale } from 'next-intl/server';
import { QuizPanel } from '@/components/quiz-panel';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <QuizPanel />;
}
