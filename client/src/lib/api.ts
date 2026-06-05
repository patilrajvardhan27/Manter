/** Typed helpers for the FastAPI service (scoring, AI red-flag, check-in). */

const BASE = process.env.NEXT_PUBLIC_FASTAPI_URL ?? "http://localhost:8000";

export interface ScoreBreakdownItem {
  quality_key: string;
  weight: number;
  man_score: number;
  contribution: number;
}

export interface ScoreResult {
  score: number; // 0–100
  breakdown: ScoreBreakdownItem[];
  strengths: string[];
  gaps: string[];
}

export async function fetchCompatibility(
  womanId: string,
  manId: string,
): Promise<ScoreResult> {
  const res = await fetch(`${BASE}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ woman_id: womanId, man_id: manId }),
  });
  if (!res.ok) throw new Error(`scoring failed: ${res.status}`);
  return res.json();
}

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
