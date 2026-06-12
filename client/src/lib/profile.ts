import { createClient } from "@/lib/supabase/server";

export type Role = "woman" | "man";

export interface Profile {
  id: string;
  role: Role;
  display_name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  photos: string[];
  verification: "unverified" | "pending" | "verified" | "rejected";
  // Optional "about you" details (see ProfileDetails / 0009 migration).
  profession: string | null;
  education: string | null;
  height_cm: number | null;
  drinking: string | null;
  smoking: string | null;
  exercise: string | null;
  relationship_goal: string | null;
  interests: string[];
}

/** The profile columns making up the optional "about you" details. */
export const DETAIL_COLUMNS =
  "profession, education, height_cm, drinking, smoking, exercise, relationship_goal, interests";

/** The signed-in user's profile, or null if they haven't onboarded yet. */
export async function getMyProfile(): Promise<{
  userId: string | null;
  profile: Profile | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { userId: null, profile: null };

  const { data } = await supabase
    .from("profiles")
    .select(`id, role, display_name, age, city, bio, photos, verification, ${DETAIL_COLUMNS}`)
    .eq("id", user.id)
    .maybeSingle();

  return { userId: user.id, profile: normalizeProfile(data) };
}

/** Coerce array columns (interests, photos) to [] when null, so callers needn't. */
function normalizeProfile(data: unknown): Profile | null {
  if (!data) return null;
  const p = data as Profile;
  return { ...p, photos: p.photos ?? [], interests: p.interests ?? [] };
}
