"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, X, Sparkles, ChevronRight, MapPin, PartyPopper } from "lucide-react";
import type { DiscoverMan } from "@/lib/match";
import { VerifyBadge } from "@/components/VerifyBadge";
import { startConversation } from "@/app/discover/actions";

const THRESHOLD = 110; // px past which a release commits the swipe

/**
 * Tinder-style deck: drag the top card (or use the buttons). Right commits a
 * "like" — find-or-create the match and open the chat (server action). Left
 * passes and reveals the next card. Built on pointer events, no deps.
 */
export function SwipeDeck({ men }: { men: DiscoverMan[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [flyOut, setFlyOut] = useState<"left" | "right" | null>(null);
  const [busy, setBusy] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const current = men[index];
  const next = men[index + 1];

  function pass() {
    if (busy) return;
    setFlyOut("left");
    setBusy(true);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setDrag({ x: 0, y: 0 });
      setFlyOut(null);
      setBusy(false);
    }, 280);
  }

  async function like(man: DiscoverMan) {
    if (busy) return;
    setBusy(true);
    setFlyOut("right");
    // Let the card fly, then hand off to the server action (it redirects to chat).
    setTimeout(() => startConversation(man.id), 240);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (busy) return;
    start.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  }

  function onPointerUp() {
    if (!start.current) return;
    const { x, y } = drag;
    start.current = null;
    if (x > THRESHOLD && current) like(current);
    else if (x < -THRESHOLD) pass();
    else if (Math.abs(x) < 8 && Math.abs(y) < 8 && current && !busy)
      router.push(`/discover/${current.id}`); // a tap (not a drag) = open profile
    else setDrag({ x: 0, y: 0 }); // snap back
  }

  if (!current) {
    return (
      <div className="mt-10 rounded-[var(--radius-card)] bg-paper/70 p-8 text-center shadow-[var(--shadow-soft)]">
        <PartyPopper size={32} className="mx-auto text-plum" strokeWidth={1.8} />
        <p className="mt-3 font-display text-xl text-ink">You&apos;re all caught up.</p>
        <p className="mt-2 text-sm text-ink-soft">
          No more profiles for now. Check your chats, or come back later.
        </p>
      </div>
    );
  }

  // Top-card transform: follow the finger, with a gentle rotation + fly-out.
  const committed = flyOut
    ? { x: flyOut === "right" ? 600 : -600, rot: flyOut === "right" ? 24 : -24 }
    : { x: drag.x, rot: drag.x / 18 };
  const likeOpacity = Math.min(Math.max(drag.x / THRESHOLD, 0), 1);
  const passOpacity = Math.min(Math.max(-drag.x / THRESHOLD, 0), 1);

  return (
    <div className="mt-6 select-none">
      <div className="relative h-[440px]">
        {next ? <Card man={next} className="scale-[0.96] opacity-70" /> : null}

        <Card
          man={current}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          dragging={drag.x !== 0 && !flyOut}
          style={{
            transform: `translate(${committed.x}px, ${flyOut ? 0 : drag.y * 0.15}px) rotate(${committed.rot}deg)`,
            transition: flyOut || drag.x === 0 ? "transform 0.28s ease-out" : "none",
            cursor: "grab",
            touchAction: "pan-y",
          }}
        >
          <Stamp className="left-5 border-sage text-sage" style={{ opacity: likeOpacity }}>
            LIKE
          </Stamp>
          <Stamp className="right-5 border-redflag text-redflag" style={{ opacity: passOpacity }}>
            PASS
          </Stamp>
        </Card>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5">
        <button
          onClick={pass}
          disabled={busy}
          aria-label="Pass"
          className="flex h-16 w-16 items-center justify-center rounded-full border border-ink/10 bg-paper text-redflag shadow-[var(--shadow-soft)] transition hover:border-redflag/30 active:scale-90 disabled:opacity-40"
        >
          <X size={26} strokeWidth={2.4} />
        </button>
        <button
          onClick={() => like(current)}
          disabled={busy}
          aria-label="Like and message"
          className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-plum text-cream shadow-[var(--shadow-soft)] transition hover:bg-plum-deep active:scale-90 disabled:opacity-40"
        >
          <Heart size={28} strokeWidth={2.2} fill="currentColor" />
        </button>
      </div>
      <button
        onClick={() => router.push(`/discover/${current.id}`)}
        disabled={busy}
        className="mx-auto mt-5 flex items-center gap-1 text-xs font-semibold text-plum transition hover:gap-1.5 disabled:opacity-40"
      >
        View full profile & answers
        <ChevronRight size={14} strokeWidth={2.5} />
      </button>
      <p className="mt-2 text-center text-[0.7rem] text-ink-soft/70">
        Swipe right to message · left to pass · tap for details
      </p>
    </div>
  );
}

function Stamp({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`pointer-events-none absolute top-6 rounded-lg border-[3px] px-3 py-1 font-display text-2xl font-bold uppercase tracking-wide ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

function Card({
  man,
  children,
  className = "",
  style,
  dragging,
  ...handlers
}: {
  man: DiscoverMan;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  dragging?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-ink/[0.04] bg-paper p-6 shadow-[var(--shadow-soft)] ${className}`}
      style={style}
      {...handlers}
    >
      {children}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-medium text-ink">
            {man.display_name}
            {man.age ? <span className="text-ink-soft">, {man.age}</span> : null}
          </h2>
          {man.city ? <p className="flex items-center gap-1 text-sm text-ink-soft"><MapPin size={13} strokeWidth={2} />{man.city}</p> : null}
          <VerifyBadge status={man.verification} className="mt-1" />
        </div>
        <div className="flex shrink-0 flex-col items-center rounded-2xl bg-plum/[0.06] px-3 py-2">
          <Sparkles size={14} className="text-plum/60" strokeWidth={2.2} />
          <div className="font-display text-3xl font-light leading-tight text-plum">
            {man.score}
            <span className="text-base text-ink-soft">%</span>
          </div>
          <p className="text-[0.6rem] uppercase tracking-wider text-ink-soft">match</p>
        </div>
      </div>

      {man.bio ? (
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">{man.bio}</p>
      ) : null}

      {man.top.length ? (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {man.top.map((t) => (
            <span
              key={t}
              className="rounded-full bg-plum/10 px-2.5 py-1 text-[0.72rem] font-medium text-plum"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
