'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Database, Music, Sparkles } from 'lucide-react';
import { useAppStore } from '@/core/store';
import { announce } from '@/modules/narration';
import SplitText from '@/components/react-bits/SplitText';

const TEAM = [
  { id: 'hassan', initials: 'HA', en: 'Hassan Ahmed', ar: 'حسن أحمد' },
  { id: 'zain', initials: 'ZE', en: 'Zain Eldin', ar: 'زين الدين' },
  { id: 'nesma', initials: 'NN', en: 'Nesma Nassar', ar: 'نسمة نصار' },
  { id: 'youssef', initials: 'YA', en: 'Youssef Alnaggar', ar: 'يوسف النجار' },
  { id: 'basmala', initials: 'BS', en: 'Basmala Samy', ar: 'بسملة سامي' },
] as const;

const HOW = [
  { id: 'about.how1', Icon: Database },
  { id: 'about.how2', Icon: Music },
  { id: 'about.how3', Icon: Sparkles },
] as const;

export function AboutPage() {
  const t = useTranslations('about');
  const locale = useLocale() === 'ar' ? 'ar' : 'en';

  useEffect(() => {
    if (useAppStore.getState().mode !== 'audio_first') return;
    window.setTimeout(() => {
      announce(
        { en: 'About Earth Listens.', ar: 'عن إيرث ليسنز.' },
        { priority: 'polite', speak: true },
      );
    }, 400);
  }, []);

  return (
    <div className="relative mx-auto max-w-[1320px] px-[clamp(20px,3.4vw,48px)] pb-24">
      <section className="bloom relative z-10 grid max-w-[980px] gap-[18px]">
        <span className="v5-eyebrow">{t('eyebrow')}</span>
        {locale === 'ar' ? (
          <h1 className="display-xl">{t('hero')}</h1>
        ) : (
          <SplitText
            tag="h1"
            text={t('hero')}
            className="display-xl"
            splitType="words"
            effect="blur"
            delay={80}
            duration={0.7}
            staggerFrom="start"
            textAlign="start"
          />
        )}
        <p className="v5-lead">{t('lead')}</p>
      </section>

      <section className="relative z-10" aria-labelledby="about-how">
        <h2 id="about-how" className="v5-h2 mt-[72px]">
          {t('howTitle')}
        </h2>
        <div className="mt-6 mb-4 grid gap-3.5 sm:grid-cols-3">
          {HOW.map(({ id, Icon }, index) => (
            <article key={id} className="v5-card grid content-start gap-3 p-6">
              <span className="text-gold font-mono text-[0.8125rem]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <Icon className="text-gold size-[26px]" strokeWidth={1.75} aria-hidden="true" />
              <p className="text-ink-muted">{t(id.replace('about.', ''))}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="team" className="relative z-10 scroll-mt-28" aria-labelledby="about-team-title">
        <span className="v5-eyebrow mt-16">Ctrl+Earth</span>
        <h2 id="about-team-title" className="v5-h2 mt-2.5">
          {t('teamTitle')}
        </h2>
        <div className="mt-5 mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TEAM.map((member) => (
            <article key={member.id} className="v5-card grid content-start gap-2.5 p-[18px]">
              <span
                aria-hidden="true"
                className="font-display text-on-gold grid size-14 place-items-center rounded-full bg-[linear-gradient(135deg,var(--color-gold-hi),var(--color-gold))] font-semibold"
              >
                {member.initials}
              </span>
              <b className="text-base">{locale === 'ar' ? member.ar : member.en}</b>
              <span className="text-ink-muted text-[0.8125rem] leading-snug">
                {t(`role.${member.id}`)}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mt-16 mb-6 grid gap-3.5 lg:grid-cols-2">
        <article id="a11y" className="v5-card grid scroll-mt-28 content-start gap-3 p-7">
          <span className="v5-eyebrow">{t('a11yTitle')}</span>
          <h2 className="v5-h3">{t('a11yTitle')}</h2>
          <p className="text-ink-muted">{t('a11yBody')}</p>
        </article>
        <article className="v5-card grid content-start gap-3 p-7">
          <span className="v5-eyebrow">NASA</span>
          <h2 className="v5-h3">{t('challengeTitle')}</h2>
          <p className="text-ink-muted">{t('challengeBody')}</p>
          <h3 className="mt-2.5 text-base font-semibold">{t('creditsTitle')}</h3>
          <p className="text-ink-muted text-sm leading-relaxed">{t('credits')}</p>
        </article>
      </section>
    </div>
  );
}
