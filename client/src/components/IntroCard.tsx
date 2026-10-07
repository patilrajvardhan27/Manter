"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Intro } from "@/lib/intros";
import { respondToIntro, sendIntroFeedback } from "@/app/intro/actions";

function joinReasons(labels: string[]): string {
  const l = labels.map((x) => x.toLowerCase());
  if (l.length <= 1) return l[0] ?? "";
  return `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}`;
}

/** Today's single introduction, with the two answers that matter. */
export function IntroCard({ intro, hoursLeft }: { intro: Intro; hoursLeft: number }) {
  const [decision, setDecision] = useState(intro.myDecision);
  const [matchId, setMatchId] = useState<string | null>(intro.matchId);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const name = intro.other.display_name;

  function answer(d: "interested" | "pass") {
    setError(null);
    start(async () => {
      const res = await respondToIntro(intro.id, d);
      if (!res.ok) {
        setError(res.error ?? "Couldn't save your answer.");
        return;
      }
      setDecision(d);
      if (res.status === "matched") setMatchId(res.matchId ?? null);
    });
  }

  return (
    <article className="overflow-hidden rounded-lg border border-ink/10 bg-paper/40">
      {intro.other.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={intro.other.photo} alt={name} className="aspect-[4/5] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/5] w-full items-center justify-center bg-brand/10 font-display text-6xl text-brand">
          {name.charAt(0)}
        </div>
      )}

      <div className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-[1.8rem] font-light leading-tight text-ink">
            {name}
            {intro.other.age ? <span className="text-ink-soft">, {intro.other.age}</span> : null}
          </h2>
          <p className="text-sm text-ink-soft">
            {[intro.other.city, intro.other.verification === "verified" ? "ID verified" : null].filter(Boolean).join(", ")}
          </p>
        </div>

        {intro.other.bio ? <p className="text-[0.95rem] leading-relaxed text-ink">{intro.other.bio}</p> : null}

        {intro.reasons.length ? (
          <p className="text-[0.95rem] leading-relaxed text-ink-soft">
            You told us you care about {joinReasons(intro.reasons)}. {name} scores well on{" "}
            {intro.reasons.length > 1 ? "all of them" : "it"}, and you fit what they&apos;re looking for too.{" "}
            <span className="text-ink">{intro.score} out of 100 for both of you.</span>
          </p>
        ) : (
          <p className="text-[0.95rem] text-ink-soft">{intro.score} out of 100 for both of you.</p>
        )}

        <Link href={`/profile/${intro.other.id}`} className="inline-block text-sm font-medium text-brand underline underline-offset-4">
          See {name}&apos;s full profile and answers
        </Link>

        {matchId ? (
          <div className="space-y-3 border-t border-ink/10 pt-4">
            <p className="text-[0.95rem] text-ink">It&apos;s mutual. Your chat with {name} is open.</p>
            <Link
              href={`/chats/${matchId}`}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-brand text-[0.95rem] font-semibold text-cream"
            >
              Open chat
            </Link>
          </div>
        ) : decision === "interested" ? (
          <p className="border-t border-ink/10 pt-4 text-[0.95rem] text-ink-soft">
            You&apos;re interested. If {name} is too, your chat opens. They have {hoursLeft} hour
            {hoursLeft === 1 ? "" : "s"} left to answer.
          </p>
        ) : decision === "pass" ? (
          <p className="border-t border-ink/10 pt-4 text-[0.95rem] text-ink-soft">
            Passed. Your next introduction comes with the next round.
          </p>
        ) : (
          <div className="space-y-3 border-t border-ink/10 pt-4">
            <p className="text-sm text-ink-soft">
              Answer within {hoursLeft} hour{hoursLeft === 1 ? "" : "s"}. {name} won&apos;t see your answer unless you
              both say yes.
            </p>
            {error ? <p className="text-sm text-redflag">{error}</p> : null}
            <div className="flex gap-2">
              <button
                onClick={() => answer("interested")}
                disabled={pending}
                className="flex h-12 flex-1 items-center justify-center rounded-lg bg-brand text-[0.95rem] font-semibold text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
              >
                I&apos;m interested
              </button>
              <button
                onClick={() => answer("pass")}
                disabled={pending}
                className="flex h-12 flex-1 items-center justify-center rounded-lg border border-ink/15 text-[0.95rem] font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
              >
                Pass
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

const PAST_STATUS: Record<string, string> = {
  declined: "Didn't work out this time",
  expired: "Expired before you both answered",
};

/** One past introduction, with the "would you meet again" question once matched. */
export function PastIntro({ intro }: { intro: Intro }) {
  const [feedback, setFeedback] = useState(intro.myFeedback);
  const [pending, start] = useTransition();
  const name = intro.other.display_name;

  function rate(v: boolean) {
    start(async () => {
      const res = await sendIntroFeedback(intro.id, v);
      if (res.ok) setFeedback(v);
    });
  }

  return (
    <li className="space-y-2 border-t border-ink/10 py-4 first:border-t-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-ink">{name}</p>
        <p className="text-sm text-ink-soft">{intro.score}</p>
      </div>
      {intro.status === "matched" ? (
        <>
          {intro.matchId ? (
            <Link href={`/chats/${intro.matchId}`} className="text-sm text-brand underline underline-offset-4">
              Matched. Open chat
            </Link>
          ) : (
            <p className="text-sm text-ink-soft">Matched</p>
          )}
          {feedback === null ? (
            <div className="flex items-center gap-3 pt-1">
              <p className="text-sm text-ink-soft">Would you meet {name} again?</p>
              <button
                onClick={() => rate(true)}
                disabled={pending}
                className="rounded-md border border-ink/15 px-3 py-1 text-sm text-ink disabled:opacity-50"
              >
                Yes
              </button>
              <button
                onClick={() => rate(false)}
                disabled={pending}
                className="rounded-md border border-ink/15 px-3 py-1 text-sm text-ink disabled:opacity-50"
              >
                Not really
              </button>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              {feedback ? "You'd meet again." : "Not a repeat."} Your matchmaker will use that.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-ink-soft">{PAST_STATUS[intro.status] ?? intro.status}</p>
      )}
    </li>
  );
}
