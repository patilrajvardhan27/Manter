/** Typed helpers for the FastAPI service (AI red-flag scanning). */

const BASE = process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";

export interface RedFlagResult {
  flagged: boolean;
  flags: { category: string; severity: "low" | "medium" | "high"; rationale: string }[];
}

/** `accessToken` is the caller's Supabase session token — the FastAPI
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
