export interface QuizLogEntry {
  sessionId: string;
  seed: number;
  participantCode?: string;
  group: string;
  clipId: string;
  answer: string;
  truth: string;
  correct: boolean;
  msToAnswer: number;
  ts: string;
  training?: boolean;
}

export function emptyQuizLog(): QuizLogEntry[] {
  return [];
}

export function quizCsv(entries: readonly QuizLogEntry[]): string {
  const header = 'participant_code,group,clip_id,answer,truth,correct,ms_to_answer,ts';
  const lines = entries
    .filter((entry) => !entry.training)
    .map((entry) =>
      [
        entry.participantCode ?? '',
        entry.group,
        entry.clipId,
        entry.answer,
        entry.truth,
        String(entry.correct),
        String(entry.msToAnswer),
        entry.ts,
      ]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(','),
    );
  return [header, ...lines].join('\n');
}
