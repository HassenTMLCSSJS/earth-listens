'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { QUIZ_ANSWERS, type QuizAnswer } from '@/core/actions';
import { subscribe } from '@/core/bus';
import { seededShuffle } from '@/core/prng';
import { useContent } from '@/core/catalog';
import { useAppStore } from '@/core/store';
import { quizCsv, type QuizLogEntry } from '@/modules/quiz';
import { getPlayer, unlockAudio } from '@/modules/sonification';
import { speakNarration } from '@/modules/narration';
import { Button } from '@/components/ui/button';

/**
 * Study metadata. These values are only ever shown to organisers who arrive
 * with `?study=1` and explicitly open the optional participant details after
 * the results. The default flow never mentions sight.
 */
const GROUPS = [
  'blind',
  'low_vision',
  'sighted',
  'sighted_screen_covered',
  'prefer_not_say',
] as const;

const DEFAULT_GROUP: (typeof GROUPS)[number] = 'prefer_not_say';

function readLog(): QuizLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem('el.quiz.v1') ?? '[]') as
      { entries?: QuizLogEntry[] } | QuizLogEntry[];
    return Array.isArray(parsed) ? parsed : (parsed.entries ?? []);
  } catch {
    return [];
  }
}

export function QuizPanel() {
  const t = useTranslations();
  const resultsFlag = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get('results') === '1',
    () => false,
  );
  const study = useSyncExternalStore(
    () => () => undefined,
    () => new URLSearchParams(window.location.search).get('study') === '1',
    () => false,
  );
  const file = useContent((state) => state.quiz);
  const dispatch = useAppStore((state) => state.dispatch);
  const closeQuiz = useAppStore((state) => state.closeQuiz);
  // Two headings live in different branches, so they need their own refs.
  // A shared ref can end up pointing at the heading that just unmounted.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const stepRef = useRef<HTMLHeadingElement>(null);
  const [code, setCode] = useState('');
  const [group, setGroup] = useState<(typeof GROUPS)[number]>(DEFAULT_GROUP);
  const [studyOpen, setStudyOpen] = useState(false);
  const [phase, setPhase] = useState<'intro' | 'question' | 'reveal' | 'end'>('intro');
  const [round, setRound] = useState<'training' | 'clips'>('training');
  const [index, setIndex] = useState(0);
  const [log, setLog] = useState<QuizLogEntry[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [explore, setExplore] = useState('');
  const [ease, setEase] = useState(3);
  const [last, setLast] = useState<{
    answer: QuizAnswer;
    truth: QuizAnswer;
    correct: boolean;
  } | null>(null);
  const started = useRef(0);
  const order = useMemo(() => (file ? seededShuffle(file.clips, 20261114) : []), [file]);
  const clip = round === 'training' ? file?.training : order[index];

  useEffect(() => {
    // localStorage is unavailable during SSR, so the log is read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLog(readLog());
  }, []);

  useEffect(() => {
    if (phase === 'question' || phase === 'reveal') stepRef.current?.focus();
    else titleRef.current?.focus();
  }, [phase, index]);

  useEffect(() => {
    return subscribe('quiz_answer', (action) => {
      if (action.type !== 'quiz_answer') return;
      choose(action.answer);
    });
  });

  function answerText(answer: QuizAnswer): string {
    return t(
      answer === 'unchanged'
        ? 'quiz.same'
        : answer === 'increased'
          ? 'quiz.increased'
          : 'quiz.decreased',
    );
  }

  function persist(entries: QuizLogEntry[], meta?: { explore?: string; ease?: number }) {
    localStorage.setItem(
      'el.quiz.v1',
      JSON.stringify({ entries, explore: meta?.explore ?? explore, ease: meta?.ease ?? ease }),
    );
    setLog(entries);
  }

  function playCurrent(target = clip) {
    if (!target) return;
    unlockAudio();
    dispatch({ type: 'select_phenomenon', id: target.layerId }, 'system');
    dispatch({ type: 'set_region', region: target.region }, 'system');
    dispatch({ type: 'set_time', from: target.from, to: target.to }, 'system');
    dispatch({ type: 'play' }, 'system');
    started.current = performance.now();
    void speakNarration('quiz.question', document.documentElement.lang === 'ar' ? 'ar' : 'en');
  }

  function choose(answer: QuizAnswer) {
    const current = round === 'training' ? file?.training : order[index];
    if (!current || phase !== 'question') return;
    const correct = answer === current.truth;
    const entry: QuizLogEntry = {
      sessionId: code || 'local',
      seed: 20261114,
      ...(code ? { participantCode: code } : {}),
      group,
      clipId: current.id,
      answer,
      truth: current.truth,
      correct,
      msToAnswer: Math.round(performance.now() - started.current),
      ts: new Date().toISOString(),
      training: round === 'training',
    };
    if (round !== 'training')
      persist([...readLog().filter((item) => item.clipId !== current.id), entry]);
    setLast({ answer, truth: current.truth, correct });
    getPlayer().earcon(correct ? 'quiz_correct' : 'quiz_wrong');
    void speakNarration(
      correct ? 'quiz.correct' : 'quiz.wrong',
      document.documentElement.lang === 'ar' ? 'ar' : 'en',
    );
    setPhase('reveal');
  }

  function advance() {
    if (!file) return;
    if (round === 'training') {
      setRound('clips');
      setPhase('question');
      setIndex(0);
      setLast(null);
      playCurrent(order[0]);
      return;
    }
    if (index + 1 >= order.length) {
      setPhase('end');
      void speakNarration('quiz.end', document.documentElement.lang === 'ar' ? 'ar' : 'en');
      return;
    }
    const next = index + 1;
    setIndex(next);
    setLast(null);
    setPhase('question');
    playCurrent(order[next]);
  }

  function exportRows(): QuizLogEntry[] {
    const withStudy = study && studyOpen;
    return log
      .filter((entry) => !entry.training)
      .map((entry) => ({
        ...entry,
        ...(withStudy && code ? { participantCode: code, sessionId: code } : {}),
        group: withStudy ? group : DEFAULT_GROUP,
      }));
  }

  const graded = log.filter((entry) => !entry.training);
  const correctCount = graded.filter((entry) => entry.correct).length;
  const scoreText = `${correctCount}/${graded.length}`;
  const results = resultsFlag || phase === 'end';

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-8">
      <header className="grid gap-2">
        <span className="v5-eyebrow">{t('nav.quiz')}</span>
        <h1 ref={titleRef} tabIndex={-1} className="display text-5xl outline-none">
          {t('quiz.title')}
        </h1>
        <p className="text-ink-muted text-sm" data-testid="quiz-score">
          {t('quiz.score')} {scoreText}
        </p>
      </header>
      {phase === 'intro' ? (
        <div className="v5-card grid gap-4 p-6">
          <p className="v5-lead">{t('quiz.intro')}</p>
          <form
            className="flex flex-wrap items-center gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setRound('training');
              setPhase('question');
              void speakNarration(
                'quiz.intro',
                document.documentElement.lang === 'ar' ? 'ar' : 'en',
              );
              if (file) playCurrent(file.training);
            }}
          >
            <Button type="submit" size="lg" className="rounded-full" disabled={!file}>
              {t('quiz.start')}
            </Button>
          </form>
        </div>
      ) : null}
      {clip && phase !== 'intro' && phase !== 'end' ? (
        <div className="v5-card grid gap-4 p-6">
          <div className="text-ink-subtle flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{t('quiz.counter', { n: index + 1, total: order.length || 10 })}</span>
            <span>
              {t('quiz.score')} <strong className="text-gold">{scoreText}</strong>
            </span>
          </div>
          <h2 ref={stepRef} tabIndex={-1} className="v5-h2 outline-none">
            {round === 'training' ? t('quiz.training') : t('quiz.question')}
          </h2>
          <p data-truth={clip.truth} className="text-ink-muted">
            {t('quiz.question')}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              className="rounded-full"
              onClick={() => playCurrent(clip)}
            >
              {t('quiz.play')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => playCurrent(clip)}
            >
              {t('quiz.replay')}
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label={t('quiz.question')}>
            {QUIZ_ANSWERS.map((answer, position) => {
              const picked = last?.answer === answer;
              const isTruth = phase === 'reveal' && last?.truth === answer;
              return (
                <button
                  key={answer}
                  type="button"
                  className={[
                    'focus-visible:ring-ring/50 min-h-11 rounded-full border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]',
                    isTruth
                      ? 'border-live text-live bg-live/10'
                      : picked
                        ? 'border-danger text-danger bg-danger/10'
                        : 'border-white/20 hover:border-white/40',
                  ].join(' ')}
                  onClick={() => choose(answer)}
                >
                  {position + 1}. {answerText(answer)}
                </button>
              );
            })}
          </div>
          {last ? (
            <p
              role="status"
              className={last.correct ? 'text-live font-medium' : 'text-danger font-medium'}
            >
              {last.correct ? t('quiz.correct') : t('quiz.wrong')}{' '}
              <span className="text-ink-muted font-normal">{answerText(last.truth)}</span>
            </p>
          ) : null}
          {study && last ? (
            <p className="text-ink-subtle font-mono text-xs" aria-hidden="true">
              {last.truth} · {String(last.correct)}
            </p>
          ) : null}
          {phase === 'reveal' ? (
            <Button type="button" className="w-fit rounded-full" onClick={advance}>
              {t('quiz.next')}
            </Button>
          ) : null}
        </div>
      ) : null}
      {results ? (
        <div className="v5-card grid gap-5 p-6">
          <div className="grid gap-2">
            <span className="v5-eyebrow">{t('quiz.results')}</span>
            <h2 className="v5-h2">{t('quiz.results')}</h2>
            <p className="display text-gold text-5xl">{scoreText}</p>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">{t('quiz.explore')}</legend>
            <div className="flex flex-wrap gap-2">
              {(['yes', 'partly', 'no'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={explore === item}
                  className={[
                    'focus-visible:ring-ring/50 min-h-11 rounded-full border px-4 text-sm outline-none focus-visible:ring-[3px]',
                    explore === item
                      ? 'border-gold text-gold bg-gold/10'
                      : 'border-white/20 hover:border-white/40',
                  ].join(' ')}
                  onClick={() => setExplore(item)}
                >
                  {t(`quiz.${item}`)}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-2 text-sm">
            <span>{t('quiz.ease')}</span>
            <input
              type="range"
              min={1}
              max={5}
              value={ease}
              onChange={(event) => setEase(Number(event.target.value))}
            />
          </label>
          {study ? (
            <details
              className="rounded-2xl border border-white/15 p-4"
              open={studyOpen}
              onToggle={(event) => setStudyOpen(event.currentTarget.open)}
            >
              <summary className="cursor-pointer text-sm font-medium">{t('quiz.code')}</summary>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-sm">
                  {t('quiz.code')}
                  <input
                    className="min-h-11 w-full rounded-full border border-white/20 bg-transparent px-4"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  {t('quiz.group')}
                  <select
                    className="bg-space-950 min-h-11 w-full rounded-full border border-white/20 px-4"
                    value={group}
                    onChange={(event) => setGroup(event.target.value as typeof group)}
                  >
                    {GROUPS.map((item) => (
                      <option key={item} value={item}>
                        {t(`groups.${item}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </details>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-full"
              onClick={() => {
                const rows = exportRows();
                persist(rows, { explore, ease });
                const blob = new Blob([quizCsv(rows)], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'earth-listens-quiz.csv';
                link.click();
              }}
            >
              {t('quiz.export')}
            </Button>
            {confirm ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  localStorage.removeItem('el.quiz.v1');
                  setLog([]);
                  setConfirm(false);
                }}
              >
                {t('quiz.confirm')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setConfirm(true)}
              >
                {t('quiz.clear')}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              className="rounded-full"
              onClick={() => closeQuiz()}
            >
              {t('help.close')}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
