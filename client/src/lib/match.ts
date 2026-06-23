/**
 * Server-only data access for discovery + chat. Runs as the signed-in user
 * (anon key + their session cookie), so every read here is RLS-enforced.
 * Imports next/headers via the server client, so it can only run on the server.
 *
 * Matching is gender-symmetric: any profile can discover and be discovered by
 * any other, filtered by mutual `interested_in`, and ranked by the viewer's
 * priority weights against the candidate's quiz scores.
 */
import { createClient } from "@/lib/supabase/server";
import { scoreCandidate } from "@/lib/scoring";
import { signPhotoUrls, PHOTO_BUCKET } from "@/lib/photos";
import { QUALITIES, type QualityGroup } from "@/lib/constants/qualities";
import { DETAIL_COLUMNS, type Gender } from "@/lib/profile";
import { getMyAnswers, type AnsweredQuestion } from "@/lib/quiz-data";
import type { ProfileDetailFields } from "@/components/ProfileDetails";

/** Pull the detail columns off a profile row into the shared display shape. */
function pickDetails(row: Record<string, unknown>): ProfileDetailFields {
  return {
    profession: (row.profession as string) ?? null,
    education: (row.education as string) ?? null,
    height_cm: (row.height_cm as number) ?? null,
    drinking: (row.drinking as string) ?? null,
    smoking: (row.smoking as string) ?? null,
    exercise: (row.exercise as string) ?? null,
    relationship_goal: (row.relationship_goal as string) ?? null,
    interests: (row.interests as string[]) ?? [],
  };
}

/** True if `viewer` is open to seeing `candidateGender`, and vice versa. */
function mutuallyInterested(
  viewerGender: Gender,
  viewerInterestedIn: Gender[],
  candidateGender: Gender,
  candidateInterestedIn: Gender[],
): boolean {
  const viewerOk = viewerInterestedIn.length === 0 || viewerInterestedIn.includes(candidateGender);
  const candidateOk = candidateInterestedIn.length === 0 || candidateInterestedIn.includes(viewerGender);
  return viewerOk && candidateOk;
}

export interface DiscoverProfile {
  id: string;
  display_name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  gender: Gender;
  verification: string;
  score: number;
  top: string[];
  photos: string[]; // signed URLs, in order
  matchId: string | null; // set if a conversation already exists
}

export interface LastMessage {
  body: string;
  created_at: string;
  sender_id: string;
}

export interface Conversation {
  matchId: string;
  other: { id: string; display_name: string; verification: string };
  last: LastMessage | null;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Thread {
  matchId: string;
  status: string;
  seekerId: string;
  targetId: string;
  other: { id: string; display_name: string; age: number | null; city: string | null; verification: string };
  messages: ChatMessage[];
}

export interface ProfileView extends ProfileDetailFields {
  id: string;
  display_name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  verification: string;
  gender: Gender;
  photos: string[]; // signed URLs
}

/** Another user's profile + photos, for a standalone profile page. */
export async function getProfileView(profileId: string): Promise<ProfileView | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(`id, display_name, age, city, bio, verification, gender, photos, ${DETAIL_COLUMNS}`)
    .eq("id", profileId)
    .maybeSingle();
  if (!data) return null;
  const photos = await signPhotoUrls(supabase, data.photos as string[] | null);
  return {
    id: data.id,
    display_name: data.display_name,
    age: data.age,
    city: data.city,
    bio: data.bio,
    verification: data.verification,
    gender: data.gender,
    photos,
    ...pickDetails(data),
  };
}

/** Profiles ranked by compatibility for the given viewer, filtered by mutual interest. */
export async function getDiscovery(viewerId: string): Promise<DiscoverProfile[]> {
  const supabase = await createClient();

  const { data: viewer } = await supabase
    .from("profiles")
    .select("gender, interested_in")
    .eq("id", viewerId)
    .maybeSingle();
  if (!viewer) return [];
  const viewerInterestedIn = (viewer.interested_in as Gender[] | null) ?? [];

  const [{ data: weightRows }, { data: candidates }, { data: existing }] = await Promise.all([
    supabase.from("priority_weights").select("quality_key, weight").eq("profile_id", viewerId),
    supabase
      .from("profiles")
      .select("id, display_name, age, city, bio, gender, interested_in, verification, photos")
      .neq("id", viewerId),
    supabase.from("matches").select("id, seeker_id, target_id").or(`seeker_id.eq.${viewerId},target_id.eq.${viewerId}`),
  ]);

  const weights: Record<string, number> = {};
  (weightRows ?? []).forEach((r) => (weights[r.quality_key] = r.weight));

  const matchByOther: Record<string, string> = {};
  (existing ?? []).forEach((m) => {
    const otherId = m.seeker_id === viewerId ? m.target_id : m.seeker_id;
    matchByOther[otherId] = m.id;
  });

  const eligible = (candidates ?? []).filter((c) =>
    mutuallyInterested(viewer.gender, viewerInterestedIn, c.gender, (c.interested_in as Gender[] | null) ?? []),
  );

  const candidateIds = eligible.map((c) => c.id);
  const { data: quizRows } = await supabase
    .from("quiz_scores")
    .select("profile_id, quality_key, score")
    .in("profile_id", candidateIds.length ? candidateIds : ["00000000-0000-0000-0000-000000000000"]);

  const quizByProfile: Record<string, Record<string, number>> = {};
  (quizRows ?? []).forEach((r) => {
    (quizByProfile[r.profile_id] ??= {})[r.quality_key] = Number(r.score);
  });

  // Sign every candidate's photos in a single batch.
  const allPaths = eligible.flatMap((c) => (c.photos as string[] | null) ?? []);
  const { data: signed } = allPaths.length
    ? await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(allPaths, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return eligible
    // Drop profiles already matched/conversing — once matched, they live in Chats.
    .filter((c) => !matchByOther[c.id])
    .map((c) => {
      const { score, top } = scoreCandidate(weights, quizByProfile[c.id] ?? {});
      const photos = ((c.photos as string[] | null) ?? [])
        .map((p) => urlByPath.get(p))
        .filter((u): u is string => Boolean(u));
      return {
        id: c.id,
        display_name: c.display_name,
        age: c.age,
        city: c.city,
        bio: c.bio,
        gender: c.gender,
        verification: c.verification,
        score,
        top,
        photos,
        matchId: matchByOther[c.id] ?? null,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export interface QualityDetail {
  key: string;
  label: string;
  blurb: string;
  group: QualityGroup;
  candidateScore: number; // their self-assessment, 0–5 (0 = not answered)
  weight: number; // viewer's priority, 0–5 (0 = not weighted)
}

export interface ProfileDetail extends ProfileDetailFields {
  id: string;
  display_name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  gender: Gender;
  verification: string;
  score: number;
  matchId: string | null;
  photos: string[]; // signed URLs
  qualities: QualityDetail[]; // all 23, canonical order
  strengths: string[]; // labels they score well on among the viewer's priorities
  gaps: string[]; // labels the viewer cares about where they lag
  answers: AnsweredQuestion[]; // their situational quiz answers, in their own words
}

/** Full profile + per-quality breakdown for one candidate, scored for this viewer. */
export async function getProfileDetail(viewerId: string, candidateId: string): Promise<ProfileDetail | null> {
  const supabase = await createClient();

  const { data: candidate } = await supabase
    .from("profiles")
    .select(`id, display_name, age, city, bio, verification, gender, photos, ${DETAIL_COLUMNS}`)
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) return null;

  const photos = await signPhotoUrls(supabase, candidate.photos as string[] | null);

  const [{ data: weightRows }, { data: quizRows }, { data: existing }, answers] = await Promise.all([
    supabase.from("priority_weights").select("quality_key, weight").eq("profile_id", viewerId),
    supabase.from("quiz_scores").select("quality_key, score").eq("profile_id", candidateId),
    supabase
      .from("matches")
      .select("id")
      .or(`and(seeker_id.eq.${viewerId},target_id.eq.${candidateId}),and(seeker_id.eq.${candidateId},target_id.eq.${viewerId})`)
      .maybeSingle(),
    getMyAnswers(candidateId),
  ]);

  const weights: Record<string, number> = {};
  (weightRows ?? []).forEach((r) => (weights[r.quality_key] = r.weight));
  const quiz: Record<string, number> = {};
  (quizRows ?? []).forEach((r) => (quiz[r.quality_key] = Number(r.score)));

  const qualities: QualityDetail[] = QUALITIES.map((q) => ({
    key: q.key,
    label: q.label,
    blurb: q.blurb,
    group: q.group,
    candidateScore: quiz[q.key] ?? 0,
    weight: weights[q.key] ?? 0,
  }));

  const { score } = scoreCandidate(weights, quiz);

  const weighted = qualities.filter((q) => q.weight > 0);
  const strengths = [...weighted]
    .sort((a, b) => b.weight * b.candidateScore - a.weight * a.candidateScore)
    .slice(0, 3)
    .map((q) => q.label);
  const gaps = [...weighted]
    .filter((q) => q.candidateScore < 5)
    .sort((a, b) => b.weight * (5 - b.candidateScore) - a.weight * (5 - a.candidateScore))
    .slice(0, 3)
    .map((q) => q.label);

  return {
    id: candidate.id,
    display_name: candidate.display_name,
    age: candidate.age,
    city: candidate.city,
    bio: candidate.bio,
    gender: candidate.gender,
    verification: candidate.verification,
    score,
    matchId: existing?.id ?? null,
    photos,
    qualities,
    strengths,
    gaps,
    answers,
    ...pickDetails(candidate),
  };
}

/** All conversations the user participates in, newest activity first. */
export async function getConversations(userId: string): Promise<Conversation[]> {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, seeker_id, target_id, created_at")
    .or(`seeker_id.eq.${userId},target_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!matches || matches.length === 0) return [];

  const otherIds = matches.map((m) => (m.seeker_id === userId ? m.target_id : m.seeker_id));
  const matchIds = matches.map((m) => m.id);

  const [{ data: profs }, { data: msgs }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, verification").in("id", otherIds),
    supabase
      .from("messages")
      .select("match_id, body, created_at, sender_id")
      .in("match_id", matchIds)
      .order("created_at", { ascending: false }),
  ]);

  const profById: Record<string, { id: string; display_name: string; verification: string }> = {};
  (profs ?? []).forEach((p) => (profById[p.id] = p));

  const lastByMatch: Record<string, LastMessage> = {};
  (msgs ?? []).forEach((m) => {
    if (!lastByMatch[m.match_id]) {
      lastByMatch[m.match_id] = { body: m.body, created_at: m.created_at, sender_id: m.sender_id };
    }
  });

  return matches
    .map((m) => {
      const otherId = m.seeker_id === userId ? m.target_id : m.seeker_id;
      return {
        matchId: m.id,
        other: profById[otherId] ?? { id: otherId, display_name: "Someone", verification: "unverified" },
        last: lastByMatch[m.id] ?? null,
      };
    })
    .sort((a, b) => {
      const ta = a.last?.created_at ?? "";
      const tb = b.last?.created_at ?? "";
      return tb.localeCompare(ta);
    });
}

/** A single conversation with its messages, or null if not a participant. */
export async function getThread(matchId: string, userId: string): Promise<Thread | null> {
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, seeker_id, target_id, status")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || (match.seeker_id !== userId && match.target_id !== userId)) return null;

  const otherId = match.seeker_id === userId ? match.target_id : match.seeker_id;

  const [{ data: other }, { data: messages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, age, city, verification")
      .eq("id", otherId)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("match_id", matchId)
      .order("created_at", { ascending: true }),
  ]);

  return {
    matchId: match.id,
    status: match.status,
    seekerId: match.seeker_id,
    targetId: match.target_id,
    other: other ?? { id: otherId, display_name: "Someone", age: null, city: null, verification: "unverified" },
    messages: messages ?? [],
  };
}
