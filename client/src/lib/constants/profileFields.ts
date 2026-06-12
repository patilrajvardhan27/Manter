/**
 * Option lists for the optional "about you" profile details (profession,
 * habits, relationship goal, interests). Stored as plain text on profiles, so
 * these arrays double as the <select> choices and the seed-data vocabulary.
 */

export const DRINKING_OPTIONS = ["Never", "Socially", "Often"] as const;
export const SMOKING_OPTIONS = ["No", "Sometimes", "Yes"] as const;
export const EXERCISE_OPTIONS = ["Rarely", "Sometimes", "Often", "Daily"] as const;
export const RELATIONSHIP_GOALS = [
  "Long-term relationship",
  "Marriage",
  "Short-term",
  "Still figuring it out",
] as const;

/** Suggested interests; users can also type their own (comma-separated). */
export const INTEREST_SUGGESTIONS = [
  "Cooking",
  "Travel",
  "Reading",
  "Fitness",
  "Music",
  "Hiking",
  "Photography",
  "Movies",
  "Gaming",
  "Art",
  "Coffee",
  "Volunteering",
] as const;

export const MAX_INTERESTS = 12;

/** Parse a comma-separated interests string into a clean, de-duped, capped list. */
export function parseInterests(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= MAX_INTERESTS) break;
  }
  return out;
}
