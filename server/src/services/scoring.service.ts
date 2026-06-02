import { QualityKey, QualityScores } from '../../../shared/types';

const QUALITY_KEYS: QualityKey[] = [
  'q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11','q12',
  'q13','q14','q15','q16','q17','q18','q19','q20','q21','q22','q23',
];

/**
 * Weighted compatibility score between a woman and a man.
 * Score = Σ(weight_i × score_i) / Σ(weight_i), normalized to 0–100.
 *
 * Uses community scores if available (>= 3 ratings), else self-assessed.
 */
export function computeCompatibilityScore(
  qualityWeights: QualityScores,    // woman's priorities (1–5)
  communityScores: Partial<QualityScores>,  // man's community-rated scores (1–10)
  selfScores: QualityScores,        // man's self-assessed scores (1–10), fallback
  ratingCount: number,
): number {
  const usesCommunity = ratingCount >= 3;
  let weightedSum = 0;
  let totalWeight = 0;

  for (const key of QUALITY_KEYS) {
    const weight = qualityWeights[key] ?? 3;
    const score = usesCommunity
      ? (communityScores[key] ?? selfScores[key])
      : selfScores[key];

    weightedSum += weight * score;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  // Normalize: max possible score is 5 * 10 = 50 per quality
  const raw = weightedSum / totalWeight; // in range 1–10
  return Math.round((raw / 10) * 100);
}

/**
 * Recomputes a man's aggregate community score per quality from all ratings.
 * Called after each new rating is submitted.
 */
export function aggregateCommunityScores(
  allRatings: { qualityScores: QualityScores }[],
): { scores: QualityScores; overallScore: number } {
  if (allRatings.length === 0) {
    const empty = Object.fromEntries(QUALITY_KEYS.map((k) => [k, 0])) as QualityScores;
    return { scores: empty, overallScore: 0 };
  }

  const sums = Object.fromEntries(QUALITY_KEYS.map((k) => [k, 0])) as QualityScores;

  for (const rating of allRatings) {
    for (const key of QUALITY_KEYS) {
      sums[key] += rating.qualityScores[key] ?? 0;
    }
  }

  const scores = Object.fromEntries(
    QUALITY_KEYS.map((k) => [k, Math.round((sums[k] / allRatings.length) * 10) / 10]),
  ) as QualityScores;

  const overallScore =
    QUALITY_KEYS.reduce((sum, k) => sum + scores[k], 0) / QUALITY_KEYS.length;

  return { scores, overallScore: Math.round(overallScore * 10) / 10 };
}
