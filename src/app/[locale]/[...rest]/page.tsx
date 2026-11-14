import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

/**
 * Any unknown path inside a locale renders the localized 404 page instead of
 * falling through to the root redirect, so `/ar/...` stays Arabic.
 */
export default async function CatchAll({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
