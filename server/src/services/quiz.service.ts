import { QualityKey, QualityScores } from '../../../shared/types';

const ALL_KEYS: QualityKey[] = [
  'q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11','q12',
  'q13','q14','q15','q16','q17','q18','q19','q20','q21','q22','q23',
];

interface QuizAnswer {
  questionId: string;
  optionId: string;
  scores: Partial<Record<QualityKey, number>>;
}

/**
 * Converts raw quiz answers into a quality score map (1–10 per quality).
 * Base is 5 for every quality. Deltas from each selected answer are summed,
 * then clamped to [1, 10].
 */
export function computeQuizScores(answers: QuizAnswer[]): QualityScores {
  const raw = Object.fromEntries(ALL_KEYS.map((k) => [k, 5])) as Record<QualityKey, number>;

  for (const answer of answers) {
    for (const [key, delta] of Object.entries(answer.scores)) {
      raw[key as QualityKey] = (raw[key as QualityKey] ?? 5) + (delta ?? 0);
    }
  }

  return Object.fromEntries(
    ALL_KEYS.map((k) => [k, Math.max(1, Math.min(10, Math.round(raw[k])))]),
  ) as QualityScores;
}
