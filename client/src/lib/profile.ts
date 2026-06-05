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
}

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
    .select("id, role, display_name, age, city, bio, photos, verification")
    .eq("id", user.id)
    .maybeSingle();

  return { userId: user.id, profile: (data as Profile) ?? null };
}
