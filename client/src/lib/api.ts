/** Typed helpers for the FastAPI service (AI red-flag scanning). */

const BASE = process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";

export interface RedFlagResult {
  flagged: boolean;
  flags: { category: string; severity: "low" | "medium" | "high"; rationale: string }[];
}

/** `accessToken` is the caller's Supabase session token; the FastAPI
 * service verifies it and re-fetches the message itself, rather than
 * trusting message text supplied by the client. */
export async function scanMessage(
  messageId: string,
  accessToken: string,
): Promise<RedFlagResult> {
  const res = await fetch(`${BASE}/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message_id: messageId }),
  });
  if (!res.ok) throw new Error(`scan failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Voice matchmaker. The browser does speech-to-text and text-to-speech; these
// calls only move text. The server owns the transcript.
// ---------------------------------------------------------------------------

export interface VoiceTurn {
  session_id: string;
  say: string;
  done: boolean;
  turn: number;
  max_turns: number;
}

export interface VoiceInsights {
  traits: { quality_key: string; score: number; confidence: number; evidence: string }[];
  partner_priorities: { quality_key: string; weight: number }[];
  dealbreakers: { field: "smoking" | "drinking" | "relationship_goal"; value: string }[];
  summary: string;
}

async function postJSON<T>(path: string, body: unknown, accessToken: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `Request failed (${res.status}).`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") detail = data.detail;
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new Error(detail);
  }
  return res.json();
}

/** Start an interview (sessionId null) or answer the last question. */
export function voiceTurn(sessionId: string | null, text: string | null, accessToken: string) {
  return postJSON<VoiceTurn>("/voice/turn", { session_id: sessionId, text }, accessToken);
}

/** Turn the transcript into scores, priorities and dealbreakers. */
export function voiceFinish(sessionId: string, accessToken: string) {
  return postJSON<VoiceInsights>("/voice/finish", { session_id: sessionId }, accessToken);
}
