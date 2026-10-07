/**
 * Introductions, read through the my_introductions() RPC. Users can't read
 * the introductions table directly: each row holds both sides' reasons, and
 * the other side's reasons are derived from their private priority weights.
 */
import { createClient } from "@/lib/supabase/server";
import { PHOTO_BUCKET } from "@/lib/photos";
import { QUALITY_BY_KEY } from "@/lib/constants/qualities";

export type IntroStatus = "pending" | "matched" | "declined" | "expired";

export interface Intro {
  id: string;
  other: {
    id: string;
    display_name: string;
    age: number | null;
    city: string | null;
    bio: string | null;
    verification: string;
    photo: string | null;
  };
  score: number;
  reasons: string[]; // quality labels: why they fit what you want
  status: IntroStatus;
  myDecision: "interested" | "pass" | null;
  matchId: string | null;
  expiresAt: string;
  createdAt: string;
  myFeedback: boolean | null;
}

interface Row {
  id: string;
  other_id: string;
  score: number;
  reasons: string[] | null;
  status: IntroStatus;
  my_decision: "interested" | "pass" | null;
  match_id: string | null;
  created_at: string;
  expires_at: string;
  my_feedback: boolean | null;
}

/** The live introduction (if any) and everything before it, newest first. */
export async function getMyIntros(): Promise<{ current: Intro | null; past: Intro[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_introductions");
  if (error || !data) return { current: null, past: [] };
  const rows = data as Row[];
  if (!rows.length) return { current: null, past: [] };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, age, city, bio, verification, photos")
    .in(
      "id",
      rows.map((r) => r.other_id),
    );
  const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const firstPhotos = (profiles ?? []).map((p) => ((p.photos as string[] | null) ?? [])[0]).filter(Boolean) as string[];
  const { data: signed } = firstPhotos.length
    ? await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(firstPhotos, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  const intros: Intro[] = rows.map((r) => {
    const p = byId.get(r.other_id);
    const photoPath = ((p?.photos as string[] | null) ?? [])[0];
    return {
      id: r.id,
      other: {
        id: r.other_id,
        display_name: (p?.display_name as string) ?? "Someone",
        age: (p?.age as number | null) ?? null,
        city: (p?.city as string | null) ?? null,
        bio: (p?.bio as string | null) ?? null,
        verification: (p?.verification as string) ?? "unverified",
        photo: (photoPath && urlByPath.get(photoPath)) || null,
      },
      score: Math.round(Number(r.score)),
      reasons: (r.reasons ?? []).map((k) => QUALITY_BY_KEY[k]?.label ?? k),
      status: r.status,
      myDecision: r.my_decision,
      matchId: r.match_id,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
      myFeedback: r.my_feedback,
    };
  });

  const current = intros.find((i) => i.status === "pending") ?? null;
  return { current, past: intros.filter((i) => i !== current) };
}

export interface LearnedPreference {
  label: string;
  delta: number;
}

/** What the matchmaker has learned from your answers, strongest first. */
export async function getLearnedPreferences(userId: string): Promise<LearnedPreference[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("preference_offsets").select("quality_key, delta").eq("profile_id", userId);
  return (data ?? [])
    .map((r) => ({ label: QUALITY_BY_KEY[r.quality_key as string]?.label ?? r.quality_key, delta: Number(r.delta) }))
    .filter((r) => Math.abs(r.delta) >= 0.5)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
}
