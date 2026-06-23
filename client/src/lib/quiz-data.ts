/**
 * Quiz data access (server). Every profile answers the same situational quiz
 * (lib/constants/situational-quiz.ts) and is scored against the 23 qualities;
 * every profile also sets priority weights for what they want in a partner.
 * Both mechanics are symmetric across gender.
 */
import { createClient } from "@/lib/supabase/server";
import { SITUATIONAL_QUESTIONS } from "@/lib/constants/situational-quiz";
import { QUALITIES } from "@/lib/constants/qualities";

export interface AnsweredQuestion {
  questionId: string;
  prompt: string;
  answer: string;
}

/** A profile's answers to the situational quiz (the picked level's label, e.g. "Strongly agree"). */
export async function getMyAnswers(profileId: string): Promise<AnsweredQuestion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_answers")
    .select("question_id, answer, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });

  const rows = data ?? [];
  if (!rows.length) return [];

  const prompts = new Map<string, string>(SITUATIONAL_QUESTIONS.map((q) => [q.id, q.prompt]));

  return rows.map((r) => ({
    questionId: r.question_id as string,
    prompt: prompts.get(r.question_id as string) ?? "Question",
    answer: r.answer as string,
  }));
}

export interface QualityScore {
  key: string;
  label: string;
  score: number;
  reason: string | null;
}

/**
 * A profile's per-quality score (1–5), derived deterministically from their
 * situational quiz answers, ordered by the canonical 23-quality order.
 * Unknown keys are skipped. `reason` is a short explanation of what drove
 * that score.
 */
export async function getMyScores(profileId: string): Promise<QualityScore[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_scores")
    .select("quality_key, score, reason")
    .eq("profile_id", profileId);

  const byKey = new Map(
    (data ?? []).map((r) => [r.quality_key as string, { score: r.score as number, reason: r.reason as string | null }]),
  );
  const scores: QualityScore[] = [];
  for (const q of QUALITIES) {
    const row = byKey.get(q.key);
    if (row != null) scores.push({ key: q.key, label: q.label, score: row.score, reason: row.reason });
  }
  return scores;
}

export interface QualityWeight {
  key: string;
  label: string;
  weight: number;
}

/**
 * A profile's 1–5 priority for each quality, ordered by the canonical
 * 23-quality order. Unknown keys are skipped.
 */
export async function getMyWeights(profileId: string): Promise<QualityWeight[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("priority_weights")
    .select("quality_key, weight")
    .eq("profile_id", profileId);

  const byKey = new Map((data ?? []).map((r) => [r.quality_key as string, r.weight as number]));
  const weights: QualityWeight[] = [];
  for (const q of QUALITIES) {
    const weight = byKey.get(q.key);
    if (weight != null) weights.push({ key: q.key, label: q.label, weight });
  }
  return weights;
}

/** Has this profile completed the situational quiz yet? */
export async function hasAnsweredQuiz(profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("quiz_answers")
    .select("question_id", { count: "exact", head: true })
    .eq("profile_id", profileId);
  return (count ?? 0) > 0;
}
