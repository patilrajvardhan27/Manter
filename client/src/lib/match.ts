/**
 * Server-only data access for discovery + chat. Runs as the signed-in user
 * (anon key + their session cookie), so every read here is RLS-enforced.
 * Imports next/headers via the server client, so it can only run on the server.
 */
import { createClient } from "@/lib/supabase/server";
import { scoreMan } from "@/lib/scoring";
import { QUALITIES, type QualityGroup } from "@/lib/constants/qualities";

export interface DiscoverMan {
  id: string;
  display_name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  verification: string;
  score: number;
  top: string[];
  matchId: string | null; // set if she already started a conversation
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
  womanId: string;
  manId: string;
  other: { id: string; display_name: string; age: number | null; city: string | null; verification: string };
  messages: ChatMessage[];
}

/** Men ranked by compatibility for the given woman. */
export async function getDiscovery(womanId: string): Promise<DiscoverMan[]> {
  const supabase = await createClient();

  const [{ data: weightRows }, { data: men }, { data: existing }] = await Promise.all([
    supabase.from("woman_weights").select("quality_key, weight").eq("woman_id", womanId),
    supabase.from("profiles").select("id, display_name, age, city, bio, verification").eq("role", "man"),
    supabase.from("matches").select("id, man_id").eq("woman_id", womanId),
  ]);

  const weights: Record<string, number> = {};
  (weightRows ?? []).forEach((r) => (weights[r.quality_key] = r.weight));

  const matchByMan: Record<string, string> = {};
  (existing ?? []).forEach((m) => (matchByMan[m.man_id] = m.id));

  const manIds = (men ?? []).map((m) => m.id);
  const { data: quizRows } = await supabase
    .from("man_quiz_scores")
    .select("man_id, quality_key, score")
    .in("man_id", manIds.length ? manIds : ["00000000-0000-0000-0000-000000000000"]);

  const quizByMan: Record<string, Record<string, number>> = {};
  (quizRows ?? []).forEach((r) => {
    (quizByMan[r.man_id] ??= {})[r.quality_key] = Number(r.score);
  });

  return (men ?? [])
    .map((m) => {
      const { score, top } = scoreMan(weights, quizByMan[m.id] ?? {});
      return { ...m, score, top, matchId: matchByMan[m.id] ?? null };
    })
    .sort((a, b) => b.score - a.score);
}

export interface QualityDetail {
  key: string;
  label: string;
  blurb: string;
  group: QualityGroup;
  manScore: number; // his self-assessment, 0–5 (0 = not answered)
  weight: number; // her priority, 0–5 (0 = not weighted)
}

export interface ManDetail {
  id: string;
  display_name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  verification: string;
  score: number;
  matchId: string | null;
  qualities: QualityDetail[]; // all 23, canonical order
  strengths: string[]; // labels he scores well on among her priorities
  gaps: string[]; // labels she cares about where he lags
}

/** Full profile + per-quality breakdown for one man, scored for this woman. */
export async function getManDetail(womanId: string, manId: string): Promise<ManDetail | null> {
  const supabase = await createClient();

  const { data: man } = await supabase
    .from("profiles")
    .select("id, display_name, age, city, bio, verification, role")
    .eq("id", manId)
    .maybeSingle();
  if (!man || man.role !== "man") return null;

  const [{ data: weightRows }, { data: quizRows }, { data: existing }] = await Promise.all([
    supabase.from("woman_weights").select("quality_key, weight").eq("woman_id", womanId),
    supabase.from("man_quiz_scores").select("quality_key, score").eq("man_id", manId),
    supabase.from("matches").select("id").eq("woman_id", womanId).eq("man_id", manId).maybeSingle(),
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
    manScore: quiz[q.key] ?? 0,
    weight: weights[q.key] ?? 0,
  }));

  const { score } = scoreMan(weights, quiz);

  const weighted = qualities.filter((q) => q.weight > 0);
  const strengths = [...weighted]
    .sort((a, b) => b.weight * b.manScore - a.weight * a.manScore)
    .slice(0, 3)
    .map((q) => q.label);
  const gaps = [...weighted]
    .filter((q) => q.manScore < 5)
    .sort((a, b) => b.weight * (5 - b.manScore) - a.weight * (5 - a.manScore))
    .slice(0, 3)
    .map((q) => q.label);

  return {
    id: man.id,
    display_name: man.display_name,
    age: man.age,
    city: man.city,
    bio: man.bio,
    verification: man.verification,
    score,
    matchId: existing?.id ?? null,
    qualities,
    strengths,
    gaps,
  };
}

/** All conversations the user participates in, newest activity first. */
export async function getConversations(userId: string): Promise<Conversation[]> {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, woman_id, man_id, created_at")
    .or(`woman_id.eq.${userId},man_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!matches || matches.length === 0) return [];

  const otherIds = matches.map((m) => (m.woman_id === userId ? m.man_id : m.woman_id));
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
      const otherId = m.woman_id === userId ? m.man_id : m.woman_id;
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
    .select("id, woman_id, man_id, status")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || (match.woman_id !== userId && match.man_id !== userId)) return null;

  const otherId = match.woman_id === userId ? match.man_id : match.woman_id;

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
    womanId: match.woman_id,
    manId: match.man_id,
    other: other ?? { id: otherId, display_name: "Someone", age: null, city: null, verification: "unverified" },
    messages: messages ?? [],
  };
}
