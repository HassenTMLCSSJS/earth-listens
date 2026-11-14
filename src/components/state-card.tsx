'use client';

import { useTranslations } from 'next-intl';
import { CircleAlert, Compass } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

function StateShell({
  eyebrow,
  Icon,
  title,
  body,
  children,
}: {
  eyebrow: string;
  Icon: typeof Compass;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <main
      id="content"
      className="relative mx-auto grid min-h-[70vh] max-w-[640px] place-content-center justify-items-center gap-[18px] px-5 pt-24 pb-16 text-center"
    >
      <span className="v5-eyebrow">{eyebrow}</span>
      <span
        aria-hidden="true"
        className="border-line-strong bg-space-800 text-gold grid size-24 place-items-center rounded-full border"
      >
        <Icon className="size-9" strokeWidth={1.5} />
      </span>
      <h1 className="v5-h2">{title}</h1>
      <p className="v5-lead mx-auto">{body}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">{children}</div>
    </main>
  );
}

export function NotFoundState() {
  const t = useTranslations('states');
  return (
    <StateShell eyebrow="404" Icon={Compass} title={t('notFoundTitle')} body={t('notFoundBody')}>
      <Button asChild className="h-11 rounded-full px-6 text-[0.9375rem]">
        <Link href="/">{t('goHome')}</Link>
      </Button>
    </StateShell>
  );
}

export function ErrorState({ reset }: { reset: () => void }) {
  const t = useTranslations('states');
  return (
    <StateShell eyebrow="Error" Icon={CircleAlert} title={t('errorTitle')} body={t('errorBody')}>
      <Button className="h-11 rounded-full px-6 text-[0.9375rem]" onClick={() => reset()}>
        {t('retry')}
      </Button>
      <Button
        asChild
        variant="outline"
        className="border-line-strong h-11 rounded-full bg-white/[0.04] px-6 text-[0.9375rem]"
      >
        <Link href="/">{t('goHome')}</Link>
      </Button>
    </StateShell>
  );
}
