"use client";

import { useState, useTransition } from "react";
import { MoreVertical, UserMinus, X } from "lucide-react";
import { unmatch } from "@/app/chats/actions";

/**
 * Overflow menu in the chat header, shown only to whoever initiated the
 * match (RLS only lets the seeker unmatch). Opens a confirmation before
 * unmatching, since it permanently deletes the conversation for both people.
 */
export function UnmatchButton({ matchId, otherName }: { matchId: string; otherName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper"
        aria-label="Conversation options"
      >
        <MoreVertical size={20} strokeWidth={2.2} />
      </button>

      {confirming ? (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-ink/30 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
          onClick={() => !pending && setConfirming(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-[var(--radius-card)] bg-cream p-6 shadow-[var(--shadow-soft)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-plum/10 text-plum">
                <UserMinus size={20} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-medium leading-tight text-ink">
                  Unmatch {otherName}?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  This permanently deletes your conversation for both of you. They&apos;ll
                  reappear in Discover, and you can always start over.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper disabled:opacity-40"
                aria-label="Cancel"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-plum/20 text-sm font-semibold text-plum-deep transition active:scale-[0.98] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => startTransition(() => unmatch(matchId))}
                disabled={pending}
                className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-redflag text-sm font-semibold text-cream shadow-[var(--shadow-soft)] transition active:scale-[0.98] disabled:opacity-50"
              >
                {pending ? "Unmatching…" : "Unmatch"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
