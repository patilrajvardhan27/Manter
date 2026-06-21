/**
 * Shared 5-point agree/disagree scale for situational attitude questions.
 * Unlike the free-text behavioral questions (judged by Claude), a Likert
 * question's score is fully determined by which level the user picks —
 * cheaper to evaluate and directly comparable across men and women asked
 * about the same underlying scenario.
 */

export const LIKERT_SCALE = [
  { id: "strongly_agree", text: "Strongly agree", value: 2 },
  { id: "agree", text: "Agree", value: 1 },
  { id: "neutral", text: "Neutral", value: 0 },
  { id: "disagree", text: "Disagree", value: -1 },
  { id: "strongly_disagree", text: "Strongly disagree", value: -2 },
] as const;

export interface LikertQuality {
  key: string;
  /** true if agreeing with the statement reflects positively on this quality */
  positive: boolean;
}

/** Build the 5 standard Likert options, each carrying a quality-delta effect. */
export function likertOptions(qualities: LikertQuality[]) {
  return LIKERT_SCALE.map((level) => ({
    id: level.id,
    text: level.text,
    effects: Object.fromEntries(
      qualities.map((q) => [q.key, q.positive ? level.value : -level.value]),
    ),
  }));
}
