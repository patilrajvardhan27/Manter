"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { scanMessage, type RedFlagResult } from "@/lib/api";
import type { ChatMessage } from "@/lib/match";

const SEVERITY_STYLE: Record<string, string> = {
  low: "bg-gold/15 text-gold",
  medium: "bg-clay/15 text-clay",
  high: "bg-redflag/10 text-redflag",
};

/**
 * Realtime conversation. Messages stream in via Supabase Postgres changes;
 * sending writes straight to the messages table (RLS guards participation).
 * Every participant's incoming messages are run through the FastAPI red-flag
 * scan and any hits are surfaced inline — symmetric protection regardless of
 * gender.
 */
export function Chat({
  matchId,
  meId,
  otherName,
  initial,
}: {
  matchId: string;
  meId: string;
  otherName: string;
  initial: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [flags, setFlags] = useState<Record<string, RedFlagResult>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Only scan the other person's incoming messages.
  async function maybeScan(msg: ChatMessage) {
    if (msg.sender_id === meId) return;
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    scanMessage(msg.id, session.access_token)
      .then((r) => r.flagged && setFlags((f) => ({ ...f, [msg.id]: r })))
      .catch(() => {});
  }

  useEffect(() => {
    initial.forEach(maybeScan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          maybeScan(msg);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ match_id: matchId, sender_id: meId, body })
      .select("id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (error) {
      setDraft(body);
      return;
    }
    if (data) setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 py-4">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-ink-soft">
            Say hello to {otherName}. Messages are private to the two of you.
          </p>
        ) : null}

        {messages.map((m) => {
          const mine = m.sender_id === meId;
          const flag = flags[m.id];
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed shadow-[var(--shadow-soft)] ${
                  mine ? "bg-plum text-cream" : "bg-paper text-ink"
                }`}
              >
                {m.body}
              </div>
              {flag?.flagged
                ? flag.flags.map((f, i) => (
                    <div
                      key={i}
                      className="mt-1 max-w-[80%] rounded-xl border border-redflag/15 bg-redflag/[0.04] px-3 py-2 text-xs"
                    >
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide ${
                          SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.low
                        }`}
                      >
                        <ShieldAlert size={12} strokeWidth={2.4} />
                        {f.severity} · {f.category}
                      </span>
                      <p className="mt-1 leading-snug text-ink-soft">{f.rationale}</p>
                    </div>
                  ))
                : null}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={send}
        className="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center gap-2 bg-grain/0 py-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${otherName}…`}
          className="h-12 flex-1 rounded-2xl border border-ink/10 bg-paper px-4 text-[0.95rem] text-ink outline-none placeholder:text-ink-soft/60 focus:border-plum/40"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-plum text-cream shadow-[var(--shadow-soft)] transition active:scale-90 disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp size={20} strokeWidth={2.6} />
        </button>
      </form>
    </div>
  );
}
