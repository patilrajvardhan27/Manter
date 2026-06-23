/** Typed helpers for the FastAPI service (AI red-flag scanning). */

const BASE = process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";

export interface RedFlagResult {
  flagged: boolean;
  flags: { category: string; severity: "low" | "medium" | "high"; rationale: string }[];
}

export async function scanMessage(
  messageId: string,
  text: string,
): Promise<RedFlagResult> {
  const res = await fetch(`${BASE}/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message_id: messageId, text }),
  });
  if (!res.ok) throw new Error(`scan failed: ${res.status}`);
  return res.json();
}
