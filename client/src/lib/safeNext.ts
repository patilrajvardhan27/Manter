/**
 * Returns `next` only if it is a same-origin relative path; otherwise `fallback`.
 * Blocks open redirects such as `@evil.com`, `//evil.com` and `/\evil.com`.
 */
export function safeNext(next: string | null | undefined, fallback = "/home"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  return next;
}
