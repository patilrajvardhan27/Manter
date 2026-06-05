/**
 * Behavioral red-flag categories the AI scans for (points 28–34).
 * Each carries a "why it matters" explainer — research point 38 shows
 * explaining *why* a behavior is concerning beats a bare flag.
 */

export type RedFlagSeverity = "low" | "medium" | "high";

export interface RedFlagCategory {
  key: string;
  label: string;
  /** what the AI looks for */
  signal: string;
  /** shown to the user when raised */
  whyItMatters: string;
}

export const RED_FLAG_CATEGORIES: RedFlagCategory[] = [
  {
    key: "controlling_language",
    label: "Controlling language",
    signal: "“you should wear this”, “I decide where we go”, “I don't like your friends”.",
    whyItMatters: "Controlling who you see, wear, or do erodes your autonomy over time.",
  },
  {
    key: "anger_escalation",
    label: "Anger escalation",
    signal: "Starts calm, turns aggressive when questioned or told no.",
    whyItMatters: "Escalation when challenged is an early predictor of an unsafe dynamic.",
  },
  {
    key: "guilt_tripping",
    label: "Guilt-tripping after a no",
    signal: "Makes you feel bad for saying no to anything physical, social, or personal.",
    whyItMatters: "Healthy partners accept a no; guilt-tripping is pressure in disguise.",
  },
  {
    key: "rushing_intimacy",
    label: "Rushing intimacy",
    signal: "Creates urgency or pressure before trust is established.",
    whyItMatters: "Manufactured urgency (love-bombing) bypasses the time trust needs.",
  },
  {
    key: "dismissiveness",
    label: "Dismissing your feelings",
    signal: "“you're overreacting”, “you're too sensitive”, “why is it always a big deal”.",
    whyItMatters: "Dismissal teaches you to doubt your own feelings — a gaslighting pattern.",
  },
  {
    key: "jealousy_possessiveness",
    label: "Jealousy / possessiveness",
    signal: "Questions who you talk to, wants your location, upset by time with others.",
    whyItMatters: "Early possessiveness tends to tighten, not loosen, over time.",
  },
  {
    key: "social_misogyny",
    label: "Social misogyny",
    signal: "Laughs at sexist jokes or stays silent when women are disrespected.",
    whyItMatters: "How he treats women in a group reflects how he'll treat you privately.",
  },
];

export const RED_FLAG_KEYS = RED_FLAG_CATEGORIES.map((c) => c.key);
