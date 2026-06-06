/**
 * Compatibility scoring — a TypeScript mirror of the FastAPI engine
 * (server/app/services/scoring.py) so the discovery list can rank men in a
 * single DB round trip instead of N HTTP calls.
 *
 *   compatibility = Σ weight·manScore  /  Σ weight·5   · 100
 *
 * Community ratings aren't wired up yet, so manScore == his quiz self-score.
 * The per-match detail view can still call the FastAPI /score endpoint for the
 * full breakdown; this keeps the browse list fast.
 */
import { QUALITY_BY_KEY } from "@/lib/constants/qualities";

export interface ManScore {
  score: number; // 0–100
  top: string[]; // labels of her top-weighted qualities he scores well on
}

/** weights/quiz are quality_key -> value maps. */
export function scoreMan(
  weights: Record<string, number>,
  quiz: Record<string, number>,
): ManScore {
  const rows = Object.entries(weights)
    .filter(([, w]) => w > 0)
    .map(([key, w]) => ({ key, weight: w, manScore: quiz[key] ?? 0 }));

  if (rows.length === 0) return { score: 0, top: [] };

  const numerator = rows.reduce((s, r) => s + r.weight * r.manScore, 0);
  const denominator = rows.reduce((s, r) => s + r.weight * 5, 0);
  const score = Math.round((numerator / denominator) * 100);

  const top = [...rows]
    .sort((a, b) => b.weight * b.manScore - a.weight * a.manScore)
    .slice(0, 3)
    .map((r) => QUALITY_BY_KEY[r.key]?.label ?? r.key);

  return { score, top };
}
