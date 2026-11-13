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

const GROUPS = [
  'blind',
  'low_vision',
  'sighted',
  'sighted_screen_covered',
  'prefer_not_say',
] as const;

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
  const file = useContent((state) => state.quiz);
  const dispatch = useAppStore((state) => state.dispatch);
  const closeQuiz = useAppStore((state) => state.closeQuiz);
  const heading = useRef<HTMLHeadingElement>(null);
  const [code, setCode] = useState('');
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('prefer_not_say');
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
    heading.current?.focus();
  }, [phase, index]);

  useEffect(() => {
    return subscribe('quiz_answer', (action) => {
      if (action.type !== 'quiz_answer') return;
      choose(action.answer);
    });
  });

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

  const graded = log.filter((entry) => !entry.training);
  const correctCount = graded.filter((entry) => entry.correct).length;
  const scoreText = `${correctCount}/${graded.length}`;
  const results = resultsFlag || phase === 'end';

  return (
    <section className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      <h1 ref={heading} tabIndex={-1} className="display text-5xl">
        {t('quiz.title')}
      </h1>
      <p data-testid="quiz-score">
        {t('quiz.score')} {scoreText}
      </p>
      {phase === 'intro' ? (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            setRound('training');
            setPhase('question');
            void speakNarration('quiz.intro', document.documentElement.lang === 'ar' ? 'ar' : 'en');
            if (file) playCurrent(file.training);
          }}
        >
          <p>{t('quiz.intro')}</p>
          <label>
            {t('quiz.code')}
            <input
              className="mt-1 min-h-11 w-full rounded-full border border-white/20 bg-transparent px-4"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <label>
            {t('quiz.group')}
            <select
              className="bg-space-950 mt-1 min-h-11 w-full rounded-full border border-white/20 px-4"
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
          <Button type="submit" disabled={!file}>
            {t('quiz.start')}
          </Button>
        </form>
      ) : null}
      {clip && phase !== 'intro' && phase !== 'end' ? (
        <div className="panel grid gap-4 p-6">
          <h2 ref={heading} tabIndex={-1}>
            {round === 'training' ? t('quiz.training') : t('quiz.question')}
          </h2>
          <p>
            {index + 1} / {order.length || 10}
          </p>
          <p data-truth={clip.truth}>{t('quiz.question')}</p>
          <Button onClick={() => playCurrent(clip)}>{t('quiz.play')}</Button>
          <div className="flex flex-wrap gap-2">
            {QUIZ_ANSWERS.map((answer, position) => (
              <button
                key={answer}
                type="button"
                className="min-h-11 rounded-full border border-white/20 px-4"
                onClick={() => choose(answer)}
              >
                {position + 1}.{' '}
                {t(
                  answer === 'unchanged'
                    ? 'quiz.same'
                    : answer === 'increased'
                      ? 'quiz.increased'
                      : 'quiz.decreased',
                )}
              </button>
            ))}
          </div>
          {last ? (
            <p>
              {last.truth} · {String(last.correct)}
            </p>
          ) : null}
          {phase === 'reveal' ? <Button onClick={advance}>{t('quiz.next')}</Button> : null}
        </div>
      ) : null}
      {results ? (
        <div className="grid gap-3">
          <h2>{t('quiz.results')}</h2>
          <p>
            {t('quiz.score')} {scoreText}
          </p>
          {GROUPS.map((item) => {
            const rows = graded.filter((entry) => entry.group === item);
            const hits = rows.filter((entry) => entry.correct).length;
            return (
              <p key={item}>
                {t(`groups.${item}`)} {hits}/{rows.length}
              </p>
            );
          })}
          <fieldset>
            <legend>{t('quiz.explore')}</legend>
            {(['yes', 'partly', 'no'] as const).map((item) => (
              <label key={item} className="me-4">
                <input
                  type="radio"
                  name="explore"
                  checked={explore === item}
                  onChange={() => setExplore(item)}
                />{' '}
                {t(`quiz.${item}`)}
              </label>
            ))}
          </fieldset>
          <label>
            {t('quiz.ease')}
            <input
              type="range"
              min={1}
              max={5}
              value={ease}
              onChange={(event) => setEase(Number(event.target.value))}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-full border border-white/20 px-4"
              onClick={() => {
                persist(graded, { explore, ease });
                const blob = new Blob([quizCsv(graded)], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'earth-listens-quiz.csv';
                link.click();
              }}
            >
              {t('quiz.export')}
            </button>
            {confirm ? (
              <button
                type="button"
                className="min-h-11 rounded-full border border-white/20 px-4"
                onClick={() => {
                  localStorage.removeItem('el.quiz.v1');
                  setLog([]);
                  setConfirm(false);
                }}
              >
                {t('quiz.confirm')}
              </button>
            ) : (
              <button
                type="button"
                className="min-h-11 rounded-full border border-white/20 px-4"
                onClick={() => setConfirm(true)}
              >
                {t('quiz.clear')}
              </button>
            )}
            <button
              type="button"
              className="min-h-11 rounded-full border border-white/20 px-4"
              onClick={() => closeQuiz()}
            >
              {t('help.close')}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
