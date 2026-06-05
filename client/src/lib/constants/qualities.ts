/**
 * The 23-quality framework — the core of Manter.
 * Sourced from points.txt (1–23) and mapped to the research-backed groupings
 * in why_manter.md §4. `key` is stable and used as the DB quality identifier.
 */

export type QualityGroup =
  | "respect"
  | "emotional-maturity"
  | "safety"
  | "partnership"
  | "character";

export interface Quality {
  /** stable id used across DB + scoring */
  key: string;
  /** 1-based number from points.txt */
  n: number;
  label: string;
  /** short woman-facing description */
  blurb: string;
  group: QualityGroup;
}

export const QUALITY_GROUPS: Record<QualityGroup, { label: string; color: string }> = {
  respect: { label: "Respect & Autonomy", color: "var(--color-plum)" },
  "emotional-maturity": { label: "Emotional Maturity", color: "var(--color-clay)" },
  safety: { label: "Safety & Comfort", color: "var(--color-sage)" },
  partnership: { label: "Partnership", color: "var(--color-gold)" },
  character: { label: "Character", color: "var(--color-plum-deep)" },
};

export const QUALITIES: Quality[] = [
  { key: "respects_decisions", n: 1, label: "Respects her decisions", blurb: "Honors her independence and the choices she makes.", group: "respect" },
  { key: "protects_not_controls", n: 2, label: "Protects, never controls", blurb: "Has her back without dictating her life.", group: "respect" },
  { key: "supportive_not_jealous", n: 3, label: "Supportive of her success", blurb: "Cheers her on instead of getting jealous.", group: "respect" },
  { key: "trustworthy", n: 4, label: "Loyal, honest & kind", blurb: "Trustworthy, helpful, understanding, caring.", group: "character" },
  { key: "vibe_match", n: 5, label: "Thoughts connect", blurb: "Your minds and vibe genuinely match.", group: "character" },
  { key: "takes_her_side", n: 6, label: "Takes a stand for her", blurb: "Speaks up for her when she can't.", group: "respect" },
  { key: "notices_small_things", n: 7, label: "Notices the small things", blurb: "Pays attention to the little details.", group: "emotional-maturity" },
  { key: "patient", n: 8, label: "Patient, gives space", blurb: "Never rushes; gives space when needed.", group: "safety" },
  { key: "emotionally_intelligent", n: 9, label: "Emotionally mature", blurb: "Emotionally intelligent, not just academic.", group: "emotional-maturity" },
  { key: "sense_of_humour", n: 10, label: "A little funny", blurb: "Has a sense of humour — a little crazy.", group: "character" },
  { key: "respects_boundaries", n: 11, label: "Respects boundaries", blurb: "Never forces anything she's not comfortable with.", group: "safety" },
  { key: "feels_safe", n: 12, label: "Makes her feel safe", blurb: "She can be herself, share anything, no judgment.", group: "safety" },
  { key: "confident_self_respect", n: 13, label: "Confident & self-respecting", blurb: "Secure in himself, with healthy self-respect.", group: "character" },
  { key: "expresses_emotions", n: 14, label: "Expresses his feelings", blurb: "Can cry, share, be vulnerable — no 'real men don't'.", group: "emotional-maturity" },
  { key: "no_womanhood_taboo", n: 15, label: "No taboo about womanhood", blurb: "Understands periods and women's experiences.", group: "respect" },
  { key: "no_misogyny", n: 16, label: "Never mocks women to fit in", blurb: "Won't put women down to look cool.", group: "character" },
  { key: "ambitious", n: 17, label: "Ambitious & hardworking", blurb: "Driven, futuristic, won't settle for less.", group: "partnership" },
  { key: "no_anger_issues", n: 18, label: "Calm, no anger issues", blurb: "His presence feels peaceful, never toxic.", group: "safety" },
  { key: "shares_chores", n: 19, label: "Shares the load 50–50", blurb: "Cooks, does chores, learns if he can't.", group: "partnership" },
  { key: "reliable", n: 20, label: "Reliable", blurb: "Does what he says he'll do.", group: "partnership" },
  { key: "basic_manners", n: 21, label: "Basic manners", blurb: "Doesn't judge people by money or looks.", group: "character" },
  { key: "humble", n: 22, label: "Humble & down to earth", blurb: "Grounded, not full of himself.", group: "character" },
  { key: "no_ego", n: 23, label: "No ego", blurb: "Can let go of being right.", group: "emotional-maturity" },
];

export const QUALITY_BY_KEY = Object.fromEntries(QUALITIES.map((q) => [q.key, q]));
