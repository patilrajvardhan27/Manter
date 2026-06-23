/**
 * Compatibility scoring — ranks a candidate profile against the viewer's
 * priority weights and the candidate's character score.
 *
 *   compatibility = Σ weight·candidateScore / Σ weight·5 · 100
 */
import { QUALITY_BY_KEY } from "@/lib/constants/qualities";

export interface CandidateScore {
  score: number; // 0–100
  top: string[]; // labels of the viewer's top-weighted qualities the candidate scores well on
}

/** weights/quiz are quality_key -> value maps. */
export function scoreCandidate(
  weights: Record<string, number>,
  quiz: Record<string, number>,
): CandidateScore {
  const rows = Object.entries(weights)
    .filter(([, w]) => w > 0)
    .map(([key, w]) => ({ key, weight: w, candidateScore: quiz[key] ?? 0 }));

  if (rows.length === 0) return { score: 0, top: [] };

  const numerator = rows.reduce((s, r) => s + r.weight * r.candidateScore, 0);
  const denominator = rows.reduce((s, r) => s + r.weight * 5, 0);
  const score = Math.round((numerator / denominator) * 100);

  const top = [...rows]
    .sort((a, b) => b.weight * b.candidateScore - a.weight * a.candidateScore)
    .slice(0, 3)
    .map((r) => QUALITY_BY_KEY[r.key]?.label ?? r.key);

  return { score, top };
}
