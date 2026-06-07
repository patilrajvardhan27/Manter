/**
 * Quiz data access (server). The 6 default behavioral questions come from
 * lib/constants/quiz.ts; women's custom questions come from the DB. Men answer
 * both, and their choices derive per-quality self-assessment scores.
 */
import { createClient } from "@/lib/supabase/server";
import { QUIZ_QUESTIONS } from "@/lib/constants/quiz";
import { QUALITIES, QUALITY_BY_KEY } from "@/lib/constants/qualities";

export interface QualityRef {
  key: string;
  label: string;
}

export interface Question {
  id: string;
  prompt: string;
  qualities: QualityRef[]; // which of the 23 this question measures
  custom: boolean;
}

/** Map quality keys to {key,label}, dropping any that aren't one of the 23. */
function toRefs(keys: string[]): QualityRef[] {
  const seen = new Set<string>();
  const refs: QualityRef[] = [];
  for (const key of keys) {
    const q = QUALITY_BY_KEY[key];
    if (q && !seen.has(key)) {
      seen.add(key);
      refs.push({ key, label: q.label });
    }
  }
  return refs;
}

/** Default questions first, then every active woman-authored question. */
export async function getActiveQuestions(): Promise<Question[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_questions")
    .select("id, prompt, quality_key")
    .eq("active", true)
    .order("created_at", { ascending: true });

  // A default question measures the union of qualities its options touched.
  const defaults: Question[] = QUIZ_QUESTIONS.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    qualities: toRefs(q.options.flatMap((o) => Object.keys(o.effects))),
    custom: false,
  }));

  const custom: Question[] = (data ?? []).map((r) => ({
    id: r.id as string,
    prompt: r.prompt as string,
    qualities: toRefs(r.quality_key ? [r.quality_key as string] : []),
    custom: true,
  }));

  return [...defaults, ...custom];
}

/** Questions a given woman has authored. */
export async function getMyQuestions(womanId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_questions")
    .select("id, prompt, quality_key, created_at, active")
    .eq("created_by", womanId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    prompt: r.prompt as string,
    qualityLabel: r.quality_key ? QUALITY_BY_KEY[r.quality_key as string]?.label ?? r.quality_key : null,
    active: r.active as boolean,
  }));
}

export interface AnsweredQuestion {
  questionId: string;
  prompt: string;
  answer: string;
}

/**
 * A man's written quiz answers paired with the question prompt. question_id can
 * reference a code-defined default ("q1_decision") or a custom question's uuid,
 * so prompts are resolved from both QUIZ_QUESTIONS and the quiz_questions table.
 */
export async function getMyAnswers(manId: string): Promise<AnsweredQuestion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_answers")
    .select("question_id, answer, created_at")
    .eq("man_id", manId)
    .order("created_at", { ascending: true });

  const rows = data ?? [];
  if (!rows.length) return [];

  // Default prompts from app code; the rest are custom-question uuids.
  const prompts = new Map<string, string>(QUIZ_QUESTIONS.map((q) => [q.id, q.prompt]));
  const missing = rows
    .map((r) => r.question_id as string)
    .filter((id) => !prompts.has(id));

  if (missing.length) {
    const { data: custom } = await supabase
      .from("quiz_questions")
      .select("id, prompt")
      .in("id", missing);
    for (const c of custom ?? []) prompts.set(c.id as string, c.prompt as string);
  }

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
}

/**
 * A man's Claude-derived per-quality self-assessment scores (1–5), ordered by
 * the canonical 23-quality order. Unknown keys are skipped.
 */
export async function getMyScores(manId: string): Promise<QualityScore[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("man_quiz_scores")
    .select("quality_key, score")
    .eq("man_id", manId);

  const byKey = new Map((data ?? []).map((r) => [r.quality_key as string, r.score as number]));
  const scores: QualityScore[] = [];
  for (const q of QUALITIES) {
    const score = byKey.get(q.key);
    if (score != null) scores.push({ key: q.key, label: q.label, score });
  }
  return scores;
}

export interface QualityWeight {
  key: string;
  label: string;
  weight: number;
}

/**
 * A woman's 1–5 priority for each quality, ordered by the canonical 23-quality
 * order. Unknown keys are skipped.
 */
export async function getMyWeights(womanId: string): Promise<QualityWeight[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("woman_weights")
    .select("quality_key, weight")
    .eq("woman_id", womanId);

  const byKey = new Map((data ?? []).map((r) => [r.quality_key as string, r.weight as number]));
  const weights: QualityWeight[] = [];
  for (const q of QUALITIES) {
    const weight = byKey.get(q.key);
    if (weight != null) weights.push({ key: q.key, label: q.label, weight });
  }
  return weights;
}

/** Has this man completed the quiz yet? */
export async function hasAnsweredQuiz(manId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("quiz_answers")
    .select("question_id", { count: "exact", head: true })
    .eq("man_id", manId);
  return (count ?? 0) > 0;
}
