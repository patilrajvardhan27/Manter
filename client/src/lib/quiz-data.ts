/**
 * Quiz data access (server). The 6 default behavioral questions come from
 * lib/constants/quiz.ts; women's custom questions come from the DB. Men answer
 * both, and their choices derive per-quality self-assessment scores.
 */
import { createClient } from "@/lib/supabase/server";
import { QUIZ_QUESTIONS } from "@/lib/constants/quiz";
import { QUALITY_BY_KEY } from "@/lib/constants/qualities";

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

/** Has this man completed the quiz yet? */
export async function hasAnsweredQuiz(manId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("quiz_answers")
    .select("question_id", { count: "exact", head: true })
    .eq("man_id", manId);
  return (count ?? 0) > 0;
}
