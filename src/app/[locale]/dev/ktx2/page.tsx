import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { Ktx2Smoke } from '@/components/ktx2-smoke';

export const dynamic = 'force-dynamic';

export default async function Ktx2SmokePage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <section className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
      <h1 className="text-3xl">KTX2 smoke</h1>
      <Ktx2Smoke />
    </section>
  );
}
